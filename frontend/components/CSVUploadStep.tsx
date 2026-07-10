'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, Loader2, AlertCircle, Calendar, CheckCircle2, History, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface CSVUploadStepProps {
  onUploadSuccess: (data: {
    jobId: string;
    fileName: string;
    fileSize: number;
    headers: string[];
    sampleRows: any[];
    suggestedMappings: any[];
    geminiError: string | null;
    localRows: any[];
  }) => void;
}

export default function CSVUploadStep({ onUploadSuccess }: CSVUploadStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);

  // Load recent uploads from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('groweasy_import_history');
      if (stored) {
        const jobs = JSON.parse(stored);
        setRecentUploads(jobs.slice(0, 3)); // Display last 3 uploads
      }
    } catch (err) {
      console.error('Failed to load recent files history:', err);
    }
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // File structure validations
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Invalid file format. Please upload a CSV file.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds the 10MB limit.');
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);

      // 1. Parse CSV locally
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: async (localParseResults) => {
          const localRows = localParseResults.data;
          setUploadProgress(30);

          // 2. Upload file to server for suggested mappings
          const formData = new FormData();
          formData.append('file', file);

          try {
            const apiKey = localStorage.getItem('user_gemini_key') || '';
            const headers: Record<string, string> = {};
            if (apiKey) {
              headers['x-gemini-key'] = apiKey;
            }

            setUploadProgress(60);
            const response = await fetch('/api/upload', {
              method: 'POST',
              headers,
              body: formData,
            });

            setUploadProgress(90);
            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.error || 'Upload failed');
            }

            setUploadProgress(100);
            toast.success('CSV uploaded and parsed successfully!');

            if (result.geminiError) {
              toast.warning('Gemini mapping suggestion warning: ' + result.geminiError);
            }

            onUploadSuccess({
              ...result,
              localRows,
            });
          } catch (err: any) {
            console.error('File upload error:', err);
            toast.error(err.message || 'Error uploading file.');
          } finally {
            setIsUploading(false);
            setUploadProgress(0);
          }
        },
        error: (error) => {
          setIsUploading(false);
          setUploadProgress(0);
          toast.error(`Local parsing failed: ${error.message}`);
        },
      });
    },
    [onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
  });

  const downloadSampleTemplate = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid popping browse window
    try {
      const sampleHeaders = 'Full Name,Email Address,Phone Number,Company,City,CRM Status,Campaign Source,Possession Time,Notes';
      const sampleRows = [
        'John Doe,john.doe@example.com,+91 98765-43210,GrowEasy Agency,New York,GOOD_LEAD_FOLLOW_UP,leads_on_demand,3 Months,Looking for residential plot',
        'Jane Smith,jane.smith@groweasy.ai,,Meridian Realty,San Francisco,SALE_DONE,meridian_tower,Immediate,Deal closed yesterday',
        'Missing Contact Lead,,,,Chicago,DID_NOT_CONNECT,eden_park,1 Year+,Invalid contact row example (will be skipped)',
        'Wrong Email Lead,invalid-email-format,9876543212,Varah Group,,BAD_LEAD,varah_swamy,,Invalid email row example (will fail validation)'
      ];
      const csvContent = [sampleHeaders, ...sampleRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'groweasy_leads_sample.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Sample CSV template downloaded! You can upload it directly.');
    } catch (err) {
      toast.error('Template compilation failed.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-55 sm:text-3xl">
          Upload Leads Spreadsheet
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-450 max-w-md mx-auto leading-relaxed">
          Drag & drop Facebook Ads lead exports, Real Estate CRM logs, Google Sheets, or custom CSV tables.
        </p>
      </div>

      {/* Animated Dropzone Area */}
      <Card className="overflow-hidden border border-zinc-250 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative">
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center border-2 border-dashed px-6 py-20 text-center transition-all duration-300 cursor-pointer ${
              isDragActive
                ? 'border-indigo-500 bg-indigo-500/5'
                : 'border-zinc-300 hover:border-indigo-500 dark:border-zinc-800 dark:hover:border-indigo-500'
            }`}
          >
            <input {...getInputProps()} />

            {isUploading ? (
              <div className="flex flex-col items-center gap-4 animate-in fade-in">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    AI Discovery & Normalization...
                  </p>
                  <p className="text-xs text-zinc-400">
                    Analyzing headers and recommended column mappings via Gemini 2.5 Flash.
                  </p>
                </div>
                <div className="w-48 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 shadow-sm">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-bold text-zinc-805 dark:text-zinc-200">
                    Drag and drop your file here, or{' '}
                    <span className="text-indigo-650 hover:underline dark:text-indigo-400">
                      browse
                    </span>
                  </p>
                  <p className="text-[11px] text-zinc-450 dark:text-zinc-500">
                    Supported format: CSV (.csv) up to 10MB
                  </p>
                </div>

                {/* Download Sample Template CTA for First-time users */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadSampleTemplate}
                  className="mt-2 h-10 px-4 rounded-xl border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 text-xs font-semibold text-zinc-650 dark:text-zinc-350 shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Download className="h-4 w-4 text-indigo-500" />
                  Download Sample CSV Template
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Heuristic columns info */}
      <div className="flex items-start gap-3 rounded-2xl border border-zinc-200/60 bg-zinc-50/50 p-4 dark:border-zinc-800/60 dark:bg-zinc-900/30">
        <AlertCircle className="h-5 w-5 shrink-0 text-indigo-505 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            Intelligent Columns Discovery
          </h4>
          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            No need to match column headers manually beforehand. Gemini AI maps variations like "Phone Num", "Contact", "Lead Name", and "Firm" automatically.
          </p>
        </div>
      </div>

      {/* Recent Uploads Section */}
      {recentUploads.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-1.5 text-zinc-850 dark:text-zinc-200">
            <History className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">Recent Uploads</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {recentUploads.map((job) => {
              const dateObj = new Date(job.uploadedAt);
              const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <Card
                  key={job.id}
                  className="border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/30 rounded-2xl p-4 space-y-2.5 shadow-sm hover:shadow transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block max-w-[120px]">
                      {job.fileName}
                    </span>
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                      {formatBytes(job.fileSize)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-450 dark:text-zinc-500 pt-1 border-t border-zinc-150/40 dark:border-zinc-850">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formattedDate.split(' ')[0]}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 className="h-3 w-3" />
                      {job.importedCount} rows
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
