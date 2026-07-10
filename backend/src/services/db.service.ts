import fs from 'fs';
import path from 'path';
import { DatabaseSchema, ImportJob, CRMRecord } from '../types';

const DB_FILE = path.join(__dirname, '../../data/db.json');

export class DbService {
  private static ensureDbExists() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = {
        imports: [],
        records: [],
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    }
  }

  private static readDb(): DatabaseSchema {
    this.ensureDbExists();
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading db.json, resetting database', error);
      return { imports: [], records: [] };
    }
  }

  private static writeDb(db: DatabaseSchema) {
    this.ensureDbExists();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  }

  public static getImports(): ImportJob[] {
    return this.readDb().imports;
  }

  public static getImport(id: string): ImportJob | undefined {
    return this.readDb().imports.find((imp) => imp.id === id);
  }

  public static addImport(job: ImportJob) {
    const db = this.readDb();
    db.imports.push(job);
    this.writeDb(db);
  }

  public static updateImport(id: string, updates: Partial<ImportJob>) {
    const db = this.readDb();
    const index = db.imports.findIndex((imp) => imp.id === id);
    if (index !== -1) {
      db.imports[index] = { ...db.imports[index], ...updates };
      this.writeDb(db);
    }
  }

  public static addRecords(records: CRMRecord[]) {
    const db = this.readDb();
    db.records.push(...records);
    this.writeDb(db);
  }

  public static getRecords(): CRMRecord[] {
    return this.readDb().records;
  }

  public static getAnalytics() {
    const db = this.readDb();
    const imports = db.imports;
    const records = db.records;

    const totalUploaded = imports.reduce((acc, curr) => acc + curr.totalRecords, 0);
    const totalImported = imports.reduce((acc, curr) => acc + curr.importedCount, 0);
    const totalSkipped = imports.reduce((acc, curr) => acc + curr.skippedCount, 0);
    const totalFailed = imports.reduce((acc, curr) => acc + curr.failedCount, 0);

    // Distribution by status
    const statusDistribution: Record<string, number> = {
      GOOD_LEAD_FOLLOW_UP: 0,
      DID_NOT_CONNECT: 0,
      BAD_LEAD: 0,
      SALE_DONE: 0,
    };
    
    // Distribution by data source
    const sourceDistribution: Record<string, number> = {
      leads_on_demand: 0,
      meridian_tower: 0,
      eden_park: 0,
      varah_swamy: 0,
      sarjapur_plots: 0,
    };

    records.forEach((record) => {
      if (statusDistribution[record.crm_status] !== undefined) {
        statusDistribution[record.crm_status]++;
      } else {
        statusDistribution[record.crm_status] = 1;
      }

      if (sourceDistribution[record.data_source] !== undefined) {
        sourceDistribution[record.data_source]++;
      } else {
        sourceDistribution[record.data_source] = 1;
      }
    });

    // History over time (group by day)
    const historyOverTime: Record<string, { imported: number; failed: number }> = {};
    imports.forEach((imp) => {
      if (imp.status !== 'completed' && imp.status !== 'processing') return;
      const dateStr = imp.processedAt ? imp.processedAt.split('T')[0] : imp.uploadedAt.split('T')[0];
      if (!historyOverTime[dateStr]) {
        historyOverTime[dateStr] = { imported: 0, failed: 0 };
      }
      historyOverTime[dateStr].imported += imp.importedCount;
      historyOverTime[dateStr].failed += imp.failedCount + imp.skippedCount;
    });

    const timeSeriesData = Object.entries(historyOverTime)
      .map(([date, counts]) => ({
        date,
        imported: counts.imported,
        failed: counts.failed,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7); // Last 7 days

    return {
      metrics: {
        totalImports: imports.length,
        totalUploaded,
        totalImported,
        totalSkipped,
        totalFailed,
        successRate: totalUploaded > 0 ? Math.round((totalImported / totalUploaded) * 100) : 0,
      },
      statusDistribution,
      sourceDistribution,
      timeSeriesData,
    };
  }

  // Check if email or phone already exists in records
  public static isDuplicate(email?: string, mobile?: string): boolean {
    if (!email && !mobile) return false;
    const db = this.readDb();
    return db.records.some((record) => {
      const emailMatch = email && record.email && record.email.toLowerCase() === email.toLowerCase();
      const mobileMatch = mobile && record.mobile_without_country_code && record.mobile_without_country_code === mobile;
      return emailMatch || mobileMatch;
    });
  }
}
