import fs from 'fs';
import csv from 'csv-parser';

export function parseCSVHeadersAndSample(
  filePath: string,
  sampleLimit = 5
): Promise<{ headers: string[]; samples: any[] }> {
  return new Promise((resolve, reject) => {
    const samples: any[] = [];
    let headers: string[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (hdrList) => {
        headers = hdrList;
      })
      .on('data', (row) => {
        if (samples.length < sampleLimit) {
          samples.push(row);
        }
      })
      .on('end', () => {
        resolve({ headers, samples });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

export function parseAllCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

export function jsonToCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Header row
  csvRows.push(headers.join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      const valStr = val === undefined || val === null ? '' : String(val);
      // Escape quotes and wrap in quotes if contains commas or quotes
      const escaped = valStr.replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
        ? `"${escaped}"`
        : escaped;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}
