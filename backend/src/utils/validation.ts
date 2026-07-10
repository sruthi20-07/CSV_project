import { z } from 'zod';

export const CRMStatusEnum = z.enum([
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
]);

export const DataSourceEnum = z.enum([
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
]);

export const CRMRecordSchema = z.object({
  import_id: z.string().optional(),
  created_at: z.string().default(() => new Date().toISOString()),
  name: z.string().default(''),
  email: z.string().default(''),
  country_code: z.string().default(''),
  mobile_without_country_code: z.string().default(''),
  company: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  country: z.string().default(''),
  lead_owner: z.string().default(''),
  crm_status: CRMStatusEnum.default('GOOD_LEAD_FOLLOW_UP'),
  crm_note: z.string().default(''),
  data_source: DataSourceEnum.default('leads_on_demand'),
  possession_time: z.string().default(''),
  description: z.string().default(''),
}).refine(
  (data) => {
    const hasEmail = typeof data.email === 'string' && data.email.trim().length > 0;
    const hasMobile = typeof data.mobile_without_country_code === 'string' && data.mobile_without_country_code.trim().length > 0;
    return hasEmail || hasMobile;
  },
  {
    message: "Record must contain either a valid email address or a mobile number",
    path: ['email', 'mobile_without_country_code'],
  }
);

export const ProcessImportPayloadSchema = z.object({
  jobId: z.string(),
  rows: z.array(z.record(z.string(), z.any())),
  mappings: z.record(z.string(), z.string().nullable()),
  skipDuplicates: z.boolean().default(true),
  existingEmails: z.array(z.string()).default([]),
  existingPhones: z.array(z.string()).default([]),
  defaultValues: z.object({
    lead_owner: z.string().default('System Owner'),
    crm_status: CRMStatusEnum.default('GOOD_LEAD_FOLLOW_UP'),
    data_source: DataSourceEnum.default('leads_on_demand'),
  }),
});

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a single CSV row with fallback heuristics for column discovery
 */
export const validateCSVRow = (
  row: Record<string, any>,
  nameColumn?: string | null,
  emailColumn?: string | null,
  phoneColumn?: string | null
): ValidationResult => {
  const errors: string[] = [];
  // Standard robust email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const headerKeys = Object.keys(row);

  // Heuristic column discovery
  let finalNameCol = nameColumn;
  let finalEmailCol = emailColumn;
  let finalPhoneCol = phoneColumn;

  if (!finalNameCol) {
    finalNameCol = headerKeys.find(h => {
      const l = h.toLowerCase().trim();
      return l === 'name' || l.includes('full name') || l.includes('first name') || l.includes('lead name') || l.includes('customer name') || l.includes('contact name');
    }) || null;
  }

  if (!finalEmailCol) {
    finalEmailCol = headerKeys.find(h => {
      const l = h.toLowerCase().trim();
      return l === 'email' || l === 'mail' || l.includes('email address') || l.includes('email_address') || l.includes('contact mail');
    }) || null;
  }

  if (!finalPhoneCol) {
    finalPhoneCol = headerKeys.find(h => {
      const l = h.toLowerCase().trim();
      return l.includes('phone') || l.includes('mobile') || l.includes('contact') || l.includes('phone number') || l === 'tel' || l === 'mob' || l.includes('number');
    }) || null;
  }

  const nameVal = finalNameCol ? String(row[finalNameCol] || '').trim() : '';
  const emailVal = finalEmailCol ? String(row[finalEmailCol] || '').trim() : '';
  const phoneRaw = finalPhoneCol ? String(row[finalPhoneCol] || '').trim() : '';

  // Clean phone input formatting symbols (spaces, dashes, brackets)
  const phoneVal = phoneRaw.replace(/[\s\-\(\)]/g, '');

  // 1. Name is required
  if (!nameVal) {
    errors.push('MISSING_REQUIRED');
  }

  const hasEmail = emailVal.length > 0;
  const hasPhone = phoneVal.length > 0;

  // 2. Only fail contact check if BOTH email and phone are blank
  if (!hasEmail && !hasPhone) {
    errors.push('MISSING_CONTACT');
  } else {
    // Validate email format if provided
    if (hasEmail && !emailRegex.test(emailVal)) {
      errors.push('INVALID_EMAIL');
    }
    
    // Validate phone number format if provided
    if (hasPhone) {
      // Must dial digits, allowing starting '+'
      const cleanDigits = phoneVal.replace(/^\+/, '');
      const phoneRegex = /^\d{7,15}$/; // Allows 7 to 15 digits (standard E.164)
      if (!phoneRegex.test(cleanDigits)) {
        errors.push('INVALID_PHONE');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
