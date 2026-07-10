import { GoogleGenerativeAI } from '@google/generative-ai';
import { CRMRecord, HeaderMapping, CRMStatus, DataSource } from '../types';

export class GeminiService {
  private static getClient(clientApiKey?: string): GoogleGenerativeAI | null {
    const key = clientApiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      return null;
    }
    return new GoogleGenerativeAI(key);
  }

  /**
   * Helper that executes content generation and retries on malformed JSON responses
   */
  private static async generateJSONContentWithRetry(
    model: any,
    prompt: string,
    maxRetries = 3
  ): Promise<any> {
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean markdown wrappers if returned (e.g. ```json [content] ```)
        const cleanedText = responseText
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
          
        return JSON.parse(cleanedText);
      } catch (error: any) {
        attempt++;
        lastError = error;
        console.warn(`[Gemini JSON Retry] Attempt ${attempt} failed to parse JSON: ${error.message}`);
        
        // Wait briefly before retrying
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
    }

    throw new Error(`Gemini failed to return valid schema-compliant JSON after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Intelligently maps unknown CSV columns to the CRM required fields
   */
  public static async suggestHeaderMapping(
    headers: string[],
    sampleRows: any[],
    apiKeyOverride?: string
  ): Promise<HeaderMapping[]> {
    const client = this.getClient(apiKeyOverride);
    if (!client) {
      throw new Error('Google Gemini API Key is missing. Please set it in settings or environment.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = client.getGenerativeModel({ 
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' }
    });

    const crmFieldsDescription = `
      - created_at: The creation date/time of the record.
      - name: The full name or first/last name of the contact.
      - email: The email address of the contact.
      - country_code: The dialing prefix (e.g., +1, +91, 91).
      - mobile_without_country_code: The phone/mobile number without the country code prefix.
      - company: Company or organization name.
      - city: The city.
      - state: The state or region.
      - country: The country.
      - lead_owner: The owner/assignee of the lead.
      - crm_status: The status (e.g., GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE).
      - crm_note: Any notes, extra numbers, extra emails, or additional info.
      - data_source: Campaign or source name (e.g., leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots).
      - possession_time: Timeline/timeframe for project/property possession.
      - description: A longer bio, requirements description, or message.
    `;

    const prompt = `
      [Prompt Template: CRM_COLUMN_MAPPING_DISCOVERY]
      You are an expert CRM AI SaaS architect mapping data pipelines.
      Your task is to analyze unknown CSV column headers and sample rows, and recommend mappings to the GrowEasy CRM Schema.

      GrowEasy Schema fields and definitions:
      ${crmFieldsDescription}

      Unknown CSV columns list:
      ${JSON.stringify(headers)}

      Sample data rows from CSV:
      ${JSON.stringify(sampleRows)}

      Instructions:
      1. For each of our CRM fields, detect which CSV header maps to it. 
      2. Set "csvColumn" to the matched header string. Set it to null if no column matches.
      3. Set "confidence" as a score between 0 and 100 representing mapping certainty.
      4. Write a concise "rationale" explaining your reasoning.

      Return the array of matches exactly as a JSON array of objects matching this schema:
      {
        "crmField": "field_name",
        "csvColumn": "matched_csv_header_or_null",
        "confidence": number,
        "rationale": "string"
      }
    `;

    try {
      return await this.generateJSONContentWithRetry(model, prompt);
    } catch (error: any) {
      console.error('Gemini Suggest Header Mapping Error:', error);
      throw new Error(`Failed to map headers via Gemini: ${error.message}`);
    }
  }

  /**
   * Cleans, normalizes, and extracts data from a batch of CSV rows using Gemini
   */
  public static async normalizeRecordsBatch(
    rows: any[],
    mappings: Record<string, string | null>,
    defaultValues: { lead_owner: string; crm_status: CRMStatus; data_source: DataSource },
    apiKeyOverride?: string
  ): Promise<{
    normalized: Partial<CRMRecord>[];
    skipped: { rowIndex: number; rawData: any; reason: string }[];
  }> {
    const client = this.getClient(apiKeyOverride);
    if (!client) {
      throw new Error('Google Gemini API Key is missing. Please set it in settings or environment.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = client.getGenerativeModel({ 
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `
      [Prompt Template: CRM_DATA_NORMALIZATION_PIPELINE]
      You are an AI data engineering pipeline cleaning messy input spreadsheets.
      Your task is to take a batch of raw CSV rows and clean them into normalized GrowEasy CRM records.

      Column mappings config:
      ${JSON.stringify(mappings)}

      Fallback default values:
      - lead_owner: "${defaultValues.lead_owner}"
      - crm_status: "${defaultValues.crm_status}"
      - data_source: "${defaultValues.data_source}"

      Batch of raw rows to clean (with original "_rowIndex" IDs):
      ${JSON.stringify(rows)}

      Rules for normalization:
      1. CRITICAL: Skip any record that has neither a valid email nor a valid mobile number. If a row is skipped, explain why in the "skipped" list.
      2. Emails: Clean, lowercase, and trim. If multiple emails exist in the column, set the FIRST in "email" and append others to "crm_note".
      3. Mobiles: Clean out spaces, dashes, brackets, and words. Put the international dialing code (e.g. +91, 1) in "country_code" and digits in "mobile_without_country_code". If multiple numbers exist, set the FIRST in "mobile_without_country_code" and append others to "crm_note".
      4. CRM Status: Must map strictly to: "GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE". Parse values like "called, no answer" -> "DID_NOT_CONNECT", "junk/not interested" -> "BAD_LEAD", "purchased/sold" -> "SALE_DONE". Default fallback: "${defaultValues.crm_status}".
      5. Data Source: Must map strictly to: "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots". Fallback: "${defaultValues.data_source}".
      6. Dates: Parse "created_at" to ISO 8601 strings. Fallback to current timestamp.
      7. Note Aggregations: Capture unmapped row fields, secondary emails, and phone numbers in "crm_note".
      8. Possession Time: Normalize to clean text (e.g., "Immediate", "3 Months", "6 Months", "1 Year+").

      Return the response strictly as a JSON object with two fields:
      {
        "normalized": [
          {
            "row_index": number (original _rowIndex),
            "created_at": "ISO string",
            "name": "string",
            "email": "string",
            "country_code": "string",
            "mobile_without_country_code": "string",
            "company": "string",
            "city": "string",
            "state": "string",
            "country": "string",
            "lead_owner": "string",
            "crm_status": "GOOD_LEAD_FOLLOW_UP" | "DID_NOT_CONNECT" | "BAD_LEAD" | "SALE_DONE",
            "crm_note": "string",
            "data_source": "leads_on_demand" | "meridian_tower" | "eden_park" | "varah_swamy" | "sarjapur_plots",
            "possession_time": "string",
            "description": "string"
          }
        ],
        "skipped": [
          {
            "rowIndex": number (original _rowIndex),
            "reason": "string describing skipped reason"
          }
        ]
      }
    `;

    try {
      const resultData = await this.generateJSONContentWithRetry(model, prompt);
      return {
        normalized: resultData.normalized || [],
        skipped: resultData.skipped || [],
      };
    } catch (error: any) {
      console.error('Gemini Normalization Batch Error:', error);
      throw new Error(`Failed to normalize records via Gemini: ${error.message}`);
    }
  }
}
