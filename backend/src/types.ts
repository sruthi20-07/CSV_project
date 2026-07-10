export type CRMStatus =
  | 'GOOD_LEAD_FOLLOW_UP'
  | 'DID_NOT_CONNECT'
  | 'BAD_LEAD'
  | 'SALE_DONE';

export type DataSource =
  | 'leads_on_demand'
  | 'meridian_tower'
  | 'eden_park'
  | 'varah_swamy'
  | 'sarjapur_plots';

export interface CRMRecord {
  import_id: string;
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CRMStatus;
  crm_note: string;
  data_source: DataSource;
  possession_time: string;
  description: string;
}

export interface HeaderMapping {
  crmField: keyof CRMRecord;
  csvColumn: string | null;
  confidence: number; // 0 to 100
  rationale: string;
}

export interface ImportJob {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  filePath?: string;
  processedAt?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  duplicate_count?: number;
  mappings: Record<string, string | null>; // Maps CRMField -> CSVColumn
  defaultValues: {
    lead_owner: string;
    crm_status: CRMStatus;
    data_source: DataSource;
  };
  successFileUrl?: string;
  failedFileUrl?: string;
}

export interface ImportErrorLog {
  rowIndex: number;
  rawData: Record<string, any>;
  errors: string[];
}

export interface DatabaseSchema {
  imports: ImportJob[];
  records: CRMRecord[];
}
