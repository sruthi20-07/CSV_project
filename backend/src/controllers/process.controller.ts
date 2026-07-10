import { Request, Response } from 'express';
import { GeminiService } from '../services/gemini.service';
import { CRMRecordSchema, ProcessImportPayloadSchema, validateCSVRow } from '../utils/validation';
import { CRMRecord } from '../types';

export const processCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request configuration schema
    console.log('[API Process] Incoming batch payload:', JSON.stringify(req.body, null, 2));
    const parseResult = ProcessImportPayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.errors.map(err => {
        const path = err.path.join('.');
        return `${path ? path + ': ' : ''}${err.message}`;
      }).join(', ');

      console.error(`[API Process] Validation failed details: ${errorDetails}`);
      res.status(400).json({ success: false, error: `Validation failure: ${errorDetails}` });
      return;
    }

    const { jobId, rows, mappings, skipDuplicates, existingEmails, existingPhones, defaultValues } = parseResult.data;
    const apiKeyHeader = req.headers['x-gemini-key'] as string;
    const apiKey = apiKeyHeader || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(400).json({ error: 'Google Gemini API key is missing. Please configure it in settings.' });
      return;
    }

    console.log(`[Stateless Batch Process] Job ${jobId}: Processing batch of ${rows.length} rows`);

    const successfulRecords: CRMRecord[] = [];
    const failedRecords: Array<{ row_index: number; status: 'SKIPPED' | 'FAILED'; reason: string; raw_data: any }> = [];

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;

    // Track unique keys processed within this batch to avoid self-duplicates
    const processedEmails = new Set<string>();
    const processedPhones = new Set<string>();

    // Map existing database states into local sets for fast checking
    const dbEmails = new Set(existingEmails.map(e => e.toLowerCase().trim()));
    const dbPhones = new Set(existingPhones.map(p => p.trim()));

    try {
      // Ask Gemini to format and clean this batch
      const result = await GeminiService.normalizeRecordsBatch(
        rows,
        mappings,
        defaultValues,
        apiKey
      );

      // 1. Process rows skipped directly by the AI (empty contact fields)
      for (const skip of result.skipped) {
        skippedCount++;
        const originalRow = rows.find((r) => r._rowIndex === skip.rowIndex) || {};
        failedRecords.push({
          row_index: skip.rowIndex,
          status: 'SKIPPED',
          reason: `MISSING_CONTACT: ${skip.reason}`,
          raw_data: originalRow,
        });
      }

      // 2. Validate and screen normalized entries
      for (const record of result.normalized) {
        const rowIndex = (record as any).row_index || 0;
        const originalRow = rows.find((r) => r._rowIndex === rowIndex) || {};
        
        const { row_index, ...cleanRecord } = record as any;
        cleanRecord.import_id = jobId;

        const emailVal = typeof cleanRecord.email === 'string' ? cleanRecord.email.trim().toLowerCase() : '';
        const phoneVal = typeof cleanRecord.mobile_without_country_code === 'string' ? cleanRecord.mobile_without_country_code.trim() : '';

        // A. Standardized Policy Validation Badging
        const validation = validateCSVRow(cleanRecord, 'name', 'email', 'mobile_without_country_code');
        
        if (!validation.isValid) {
          failedCount++;
          const primaryErr = validation.errors[0];
          let reasonText = '';
          let badgeType: 'FAILED' | 'SKIPPED' = 'FAILED';

          if (primaryErr === 'MISSING_REQUIRED') {
            reasonText = 'MISSING_REQUIRED: Client name field is blank.';
            badgeType = 'FAILED';
          } else if (primaryErr === 'MISSING_CONTACT') {
            reasonText = 'MISSING_CONTACT: Record contains neither a valid email address nor a phone number.';
            badgeType = 'SKIPPED';
          } else if (primaryErr === 'INVALID_EMAIL') {
            reasonText = 'INVALID_EMAIL: Format must follow user@domain.com.';
            badgeType = 'FAILED';
          } else if (primaryErr === 'INVALID_PHONE') {
            reasonText = 'INVALID_PHONE: Format must contain only digits (minimum 7 characters).';
            badgeType = 'FAILED';
          }

          failedRecords.push({
            row_index: rowIndex,
            status: badgeType,
            reason: reasonText || `VALIDATION_ERROR: ${validation.errors.join(', ')}`,
            raw_data: originalRow,
          });
          continue;
        }

        // B. Duplicate Screening Check
        let isDupe = false;
        let dupeReason = '';

        // Check self-duplicates inside this batch
        const isEmailSelfDupe = emailVal && processedEmails.has(emailVal);
        const isPhoneSelfDupe = phoneVal && processedPhones.has(phoneVal);

        // Check database duplicates
        const isEmailDbDupe = emailVal && dbEmails.has(emailVal);
        const isPhoneDbDupe = phoneVal && dbPhones.has(phoneVal);

        if (isEmailSelfDupe || isPhoneSelfDupe) {
          isDupe = true;
          dupeReason = isEmailSelfDupe 
            ? `DUPLICATE_EMAIL: Direct copy of another row's email inside this CSV.` 
            : `DUPLICATE_PHONE: Direct copy of another row's mobile inside this CSV.`;
        } else if (isEmailDbDupe || isPhoneDbDupe) {
          isDupe = true;
          dupeReason = isEmailDbDupe 
            ? 'DUPLICATE_CRM: Email address matches an existing lead in the CRM history.'
            : 'DUPLICATE_CRM: Mobile phone matches an existing lead in the CRM history.';
        }

        if (isDupe) {
          duplicateCount++;
          if (skipDuplicates) {
            skippedCount++;
            failedRecords.push({
              row_index: rowIndex,
              status: 'SKIPPED',
              reason: dupeReason,
              raw_data: originalRow,
            });
            continue;
          } else {
            cleanRecord.crm_note = cleanRecord.crm_note
              ? `[IMPORT WARNING - DUPLICATE DETECTED] ${dupeReason}; ${cleanRecord.crm_note}`
              : `[IMPORT WARNING - DUPLICATE DETECTED] ${dupeReason}`;
          }
        }

        // Update tracking sets
        if (emailVal) processedEmails.add(emailVal);
        if (phoneVal) processedPhones.add(phoneVal);

        // Zod validation check
        const schemaValidation = CRMRecordSchema.safeParse(cleanRecord);
        if (schemaValidation.success) {
          importedCount++;
          successfulRecords.push(schemaValidation.data as CRMRecord);
        } else {
          failedCount++;
          const zodErrors = schemaValidation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
          failedRecords.push({
            row_index: rowIndex,
            status: 'FAILED',
            reason: `VALIDATION_FAILED: ${zodErrors}`,
            raw_data: originalRow,
          });
        }
      }
    } catch (batchErr: any) {
      console.error(`[Process Error] Batch execution failed:`, batchErr);
      for (const row of rows) {
        failedCount++;
        failedRecords.push({
          row_index: row._rowIndex,
          status: 'FAILED',
          reason: `BATCH_PROCESSING_ERROR: ${batchErr.message || 'Gemini processing failed'}`,
          raw_data: row,
        });
      }
    }

    res.json({
      success: true,
      jobId,
      totalRecords: rows.length,
      importedCount,
      skippedCount,
      failedCount,
      duplicateCount,
      successfulRecords,
      failedRecords,
    });
  } catch (error: any) {
    console.error('[Stateless Process CSV Error]:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
