'use client';

import React from 'react';
import { Loader2, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface ProcessingStepProps {
  stats: {
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    duplicateCount: number;
    status: 'processing' | 'completed' | 'failed';
  };
  totalRecords: number;
  onRetry: () => void;
}

export default function ProcessingStep({
  stats,
  totalRecords,
  onRetry,
}: ProcessingStepProps) {
  const processedCount = stats.importedCount + stats.skippedCount + stats.failedCount;
  const progressPercent = totalRecords > 0 
    ? Math.min(Math.round((processedCount / totalRecords) * 100), 100) 
    : 0;

  // SVG Progress Ring metrics
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Determine stage checkmarks
  const isUploadDone = true;
  const isCsvParsed = true;
  const isMappingDone = true;
  const isValidating = stats.status === 'processing';
  const isValidationDone = stats.status === 'completed';
  const isImportDone = stats.status === 'completed';

  const stages = [
    { label: 'Upload Complete', done: isUploadDone, active: false },
    { label: 'CSV Structure Parsed', done: isCsvParsed, active: false },
    { label: 'AI Mapping Complete', done: isMappingDone, active: false },
    { label: 'Validation & Deduplication Running', done: isValidationDone, active: isValidating },
    { label: 'Import Finalized & Saved', done: isImportDone, active: false },
  ];

  return (
    <div className="space-y-8 max-w-xl mx-auto py-4">
      {/* Top Header */}
      <div className="text-center space-y-2 animate-in fade-in duration-300">
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Stateless Import Engine Running
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          Google Gemini 2.5 Flash is executing bulk records normalizations sequentially in the browser. Please keep this window open.
        </p>
      </div>

      {/* Large Progress Ring & Visual Stats */}
      <Card className="border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 p-6 flex flex-col items-center justify-center text-center shadow-lg rounded-2xl animate-in zoom-in-95 duration-300">
        {/* SVG Progress Ring */}
        <div className="relative h-40 w-40">
          <svg className="h-full w-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              className="text-zinc-100 dark:text-zinc-800"
              strokeWidth="8"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="url(#progressGradient)"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5">
            <span className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
              {progressPercent}%
            </span>
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">
              {processedCount} / {totalRecords} rows
            </span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full mt-6 space-y-2">
          <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200/10">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Checklist Stepper Timeline */}
      <Card className="border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 rounded-2xl shadow-sm animate-in zoom-in-95 duration-500">
        <CardContent className="p-5 space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-400 block mb-2 font-mono">
            Pipeline Stages
          </span>

          <div className="space-y-4">
            {stages.map((stage, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs">
                {stage.done ? (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow shadow-emerald-500/20">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                ) : stage.active ? (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 ring-2 ring-indigo-500/20">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-350 dark:border-zinc-800 dark:text-zinc-650">
                    <AlertCircle className="h-3.5 w-3.5" />
                  </div>
                )}
                <span
                  className={`font-semibold transition-colors duration-300 ${
                    stage.done
                      ? 'text-zinc-800 dark:text-zinc-200'
                      : stage.active
                      ? 'text-indigo-605 dark:text-indigo-400 font-bold'
                      : 'text-zinc-400 dark:text-zinc-600'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Counts Grid */}
      <div className="grid grid-cols-4 gap-3 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Imported</span>
          <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {stats.importedCount}
          </span>
        </div>

        <div className="flex flex-col items-center p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Duplicates</span>
          <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
            {stats.duplicateCount}
          </span>
        </div>

        <div className="flex flex-col items-center p-3 rounded-2xl bg-zinc-500/5 border border-zinc-500/10 shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Skipped</span>
          <span className="text-lg font-extrabold text-zinc-600 dark:text-zinc-450 mt-0.5">
            {stats.skippedCount - stats.duplicateCount > 0 ? stats.skippedCount - stats.duplicateCount : 0}
          </span>
        </div>

        <div className="flex flex-col items-center p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Failed</span>
          <span className="text-lg font-extrabold text-rose-600 dark:text-rose-455 mt-0.5">
            {stats.failedCount}
          </span>
        </div>
      </div>

      {/* Error state alert and Resume */}
      {stats.status === 'failed' && (
        <Card className="border border-rose-100 bg-rose-500/5 dark:border-rose-550/15 p-5 space-y-4 rounded-2xl shadow animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-455">⚠ Network Connection Interrupted</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                The batch loop encountered a connection timeout. You can resume processing directly from the last failed record.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={onRetry}
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg hover:shadow-indigo-550/25 transition-all duration-200 hover:scale-105 active:scale-95 text-xs"
            >
              Resume Processing
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
