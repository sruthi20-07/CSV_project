'use client';

import React from 'react';
import { Download, FileCheck, FileWarning, BarChart, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';

interface ResultsStepProps {
  fileName: string;
  results: {
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    totalRecords: number;
    duplicate_count: number;
    successfulRecords: any[];
    failedRecords: any[];
  };
  onFinish: () => void;
  onReset: () => void;
}

export default function ResultsStep({ fileName, results, onFinish, onReset }: ResultsStepProps) {
  const { importedCount, skippedCount, failedCount, totalRecords, duplicate_count, successfulRecords, failedRecords } = results;

  const validRecords = totalRecords - failedCount;
  const aiMappingAccuracy = totalRecords > 0 
    ? Math.round((validRecords / totalRecords) * 100) 
    : 0;
  const importSuccessRate = validRecords > 0 
    ? Math.round((importedCount / validRecords) * 100) 
    : 0;

  const convertJSONToCSV = (arr: any[]): string => {
    if (arr.length === 0) return '';
    const keys = Object.keys(arr[0]);
    const csvHeaders = keys.join(',');
    const csvRows = arr.map(row => 
      keys.map(fieldName => {
        const value = row[fieldName] === undefined || row[fieldName] === null ? '' : row[fieldName];
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    return [csvHeaders, ...csvRows].join('\n');
  };

  const triggerDownload = (csvContent: string, downloadName: string) => {
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Export file "${downloadName}" downloaded successfully.`);
    } catch (err) {
      toast.error('File compilation failed.');
    }
  };

  const handleDownloadSuccess = () => {
    if (successfulRecords.length === 0) {
      toast.warning('No successfully imported leads available for download.');
      return;
    }
    const cleanList = successfulRecords.map(({ import_id, ...r }: any) => r);
    const csv = convertJSONToCSV(cleanList);
    triggerDownload(csv, `imported_leads_${fileName}`);
  };

  const handleDownloadFailed = () => {
    if (failedRecords.length === 0) {
      toast.warning('No failed/skipped records available for download.');
      return;
    }
    const flattened = failedRecords.map((item: any) => ({
      row_index: item.row_index,
      status: item.status,
      reason: item.reason,
      ...(item.raw_data || {})
    }));
    const csv = convertJSONToCSV(flattened);
    triggerDownload(csv, `failed_diagnostic_leads_${fileName}`);
  };

  const handleDownloadValidationReport = () => {
    if (failedRecords.length === 0) {
      toast.warning('No validation failures found. Report is empty.');
      return;
    }
    const lines = [
      `GrowEasy AI CSV Importer - Validation Error Report`,
      `File Name: ${fileName}`,
      `Date: ${new Date().toLocaleString()}`,
      `====================================================`,
      `Total Rows: ${totalRecords}`,
      `Imported: ${importedCount}`,
      `Skipped Duplicates: ${duplicate_count}`,
      `Validation Failures: ${failedCount}`,
      `====================================================`,
      `List of Failures:`,
      `----------------------------------------------------`
    ];

    failedRecords.forEach((f, idx) => {
      lines.push(`${idx + 1}. Row ${f.row_index} | [${f.status}] Reason: ${f.reason}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `validation_report_${fileName.replace(/\.csv$/i, '')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Validation report downloaded.');
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-4">
      {/* Celebration checkmark anim */}
      <div className="text-center space-y-4">
        <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 animate-ping duration-1000" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 animate-in zoom-in duration-300">
            <svg className="h-8 w-8 stroke-[3.5] animate-in slide-in-from-bottom-2 duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>
        
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            🎉 Import Completed Successfully!
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            All leads rows have been run against stateless validation filters.
          </p>
        </div>
      </div>
    {/* Success Rate Gauge & Summary Metrics */}
    <div className="grid gap-6 sm:grid-cols-2">
        {/* Success Rate Circle Card */}
        <Card className="border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 flex flex-col items-center justify-center p-6 text-center shadow-sm rounded-2xl hover:shadow-md transition-shadow gap-6">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
            Pipeline Analytics
          </span>

          <div className="flex items-center gap-6 flex-wrap justify-center">
            {/* AI Mapping Accuracy Gauge */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400">AI Mapping Accuracy</span>
              <div className="relative h-24 w-24">
                <svg className="h-full w-full transform -rotate-90">
                  <circle cx="48" cy="48" r="38" fill="transparent" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeWidth="6" />
                  <circle cx="48" cy="48" r="38" fill="transparent" stroke="#6366f1" strokeWidth="6" strokeDasharray={2 * Math.PI * 38} strokeDashoffset={2 * Math.PI * 38 - (aiMappingAccuracy / 100) * 2 * Math.PI * 38} strokeLinecap="round" className="transition-all duration-500 animate-in fade-in" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-black text-indigo-605 dark:text-indigo-400">{aiMappingAccuracy}%</span>
                </div>
              </div>
            </div>

            {/* Import Success Rate Gauge */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400">Import Success Rate</span>
              <div className="relative h-24 w-24">
                <svg className="h-full w-full transform -rotate-90">
                  <circle cx="48" cy="48" r="38" fill="transparent" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeWidth="6" />
                  <circle cx="48" cy="48" r="38" fill="transparent" stroke="#10b981" strokeWidth="6" strokeDasharray={2 * Math.PI * 38} strokeDashoffset={2 * Math.PI * 38 - (importSuccessRate / 100) * 2 * Math.PI * 38} strokeLinecap="round" className="transition-all duration-500 animate-in fade-in" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-450">{importSuccessRate}%</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-zinc-400 max-w-[240px]">
            AI Accuracy reflects data structuring quality. Import Success drops if duplicate contacts are filtered out.
          </p>
        </Card>

        {/* Metrics breakdown card */}
        <Card className="border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 p-6 flex flex-col justify-between shadow-sm rounded-2xl hover:shadow-md transition-all">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block font-mono">
              Records Breakdown
            </span>
            
            <div className="space-y-3">
              {/* Total Uploaded */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-550 dark:text-zinc-400">Total Uploaded</span>
                <span className="font-bold text-zinc-805 dark:text-zinc-200">{totalRecords} rows</span>
              </div>
              {/* Successfully Imported */}
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 text-zinc-550 dark:text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Successfully Imported
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{importedCount} rows</span>
              </div>
              {/* Duplicates skipped */}
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 text-zinc-550 dark:text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Duplicates Detected
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{duplicate_count} rows</span>
              </div>
              {/* Skipped */}
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 text-zinc-550 dark:text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-zinc-400" />
                  Skipped (No Contact)
                </span>
                <span className="font-bold text-zinc-600 dark:text-zinc-300">{skippedCount - duplicate_count > 0 ? skippedCount - duplicate_count : 0} rows</span>
              </div>
              {/* Failed */}
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 text-zinc-550 dark:text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Validation Errors
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-455">{failedCount} rows</span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-150/60 dark:border-zinc-800 pt-4 mt-4 flex items-center gap-2 text-[10.5px] text-zinc-400 leading-relaxed">
            <BarChart className="h-4 w-4 shrink-0 text-indigo-505" />
            <span>These metrics are live in your dashboard.</span>
          </div>
        </Card>
      </div>

      {/* Action Downloads card */}
      <Card className="border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-sm font-semibold text-zinc-850 dark:text-zinc-200 mb-4">
          Download Processed Files
        </h3>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Download Success CSV */}
          <Button
            variant="outline"
            disabled={importedCount === 0}
            onClick={handleDownloadSuccess}
            className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-2xl border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-305 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <FileCheck className="h-6 w-6 text-emerald-505 animate-bounce" style={{ animationDuration: '3s' }} />
            <div className="text-center">
              <span className="block font-bold">Imported CSV</span>
              <span className="text-[9px] font-normal text-zinc-400">{importedCount} leads</span>
            </div>
          </Button>

          {/* Download Failed CSV */}
          <Button
            variant="outline"
            disabled={skippedCount + failedCount === 0}
            onClick={handleDownloadFailed}
            className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-2xl border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-305 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <FileWarning className="h-6 w-6 text-rose-500" />
            <div className="text-center">
              <span className="block font-bold">Failed CSV</span>
              <span className="text-[9px] font-normal text-zinc-400">{skippedCount + failedCount} items</span>
            </div>
          </Button>

          {/* Download Validation Report */}
          <Button
            variant="outline"
            disabled={failedCount + skippedCount === 0}
            onClick={handleDownloadValidationReport}
            className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-2xl border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-305 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <FileText className="h-6 w-6 text-indigo-500" />
            <div className="text-center">
              <span className="block font-bold">Validation Report</span>
              <span className="text-[9px] font-normal text-zinc-400 font-mono">TXT Summary</span>
            </div>
          </Button>
        </div>
        {(importedCount === 0 || skippedCount + failedCount === 0) && (
          <p className="mt-4 text-[10.5px] text-zinc-450 dark:text-zinc-500 text-center leading-relaxed font-medium">
            💡 Download cards are disabled when there are zero records matching that category.
          </p>
        )}
      </Card>
    </div>
  );
}
