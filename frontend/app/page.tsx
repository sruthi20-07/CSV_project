'use client';

import React, { useState } from 'react';
import Header from '../components/Header';
import Dashboard from '../components/Dashboard';
import CSVUploadStep from '../components/CSVUploadStep';
import CSVPreviewStep from '../components/CSVPreviewStep';
import MappingStep from '../components/MappingStep';
import ProcessingStep from '../components/ProcessingStep';
import ResultsStep from '../components/ResultsStep';
import { Toaster, toast } from 'sonner';
import { ChevronRight, Upload, Table, Map, Loader2, BarChart2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function Home() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'wizard'>('dashboard');
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Wizard Shared States
  const [jobId, setJobId] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [localRows, setLocalRows] = useState<any[]>([]);
  const [suggestedMappings, setSuggestedMappings] = useState<any[]>([]);
  const [tempFilePath, setTempFilePath] = useState<string>('');
  
  // Confirmed Mappings & Defaults
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [defaultValues, setDefaultValues] = useState({
    lead_owner: 'System Owner',
    crm_status: 'GOOD_LEAD_FOLLOW_UP',
    data_source: 'leads_on_demand',
  });

  // Stateless Progress & Aggregation States
  const [processingStats, setProcessingStats] = useState({
    importedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    duplicateCount: 0,
    status: 'processing' as 'processing' | 'completed' | 'failed',
  });
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [accumulatedSuccess, setAccumulatedSuccess] = useState<any[]>([]);
  const [accumulatedFailed, setAccumulatedFailed] = useState<any[]>([]);

  // Final Results view state
  const [processingResults, setProcessingResults] = useState({
    importedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    duplicate_count: 0,
    totalRecords: 0,
    successfulRecords: [] as any[],
    failedRecords: [] as any[],
  });

  // Central trigger refs/states for step components
  const [triggerProcessSubmit, setTriggerProcessSubmit] = useState<(() => void) | null>(null);

  const handleUploadSuccess = (data: any) => {
    setJobId(data.jobId);
    setFileName(data.fileName);
    setFileSize(data.fileSize);
    setHeaders(data.headers);
    setSuggestedMappings(data.suggestedMappings || []);
    setLocalRows(data.localRows || []);
    setWizardStep(2); // Move to Preview
  };

  const handleStartImport = () => {
    setJobId('');
    setFileName('');
    setFileSize(0);
    setHeaders([]);
    setLocalRows([]);
    setSuggestedMappings([]);
    setTempFilePath('');
    setMappings({});
    setSkipDuplicates(true);
    setCurrentBatchIndex(0);
    setAccumulatedSuccess([]);
    setAccumulatedFailed([]);
    setProcessingStats({
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      duplicateCount: 0,
      status: 'processing',
    });
    setProcessingResults({
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      duplicate_count: 0,
      totalRecords: 0,
      successfulRecords: [],
      failedRecords: [],
    });
    setWizardStep(1);
    setViewMode('wizard');
  };

  const handleStartProcessing = async (
    confirmedMappings: Record<string, string | null>,
    shouldSkipDuplicates: boolean,
    confirmedDefaults: typeof defaultValues
  ) => {
    setMappings(confirmedMappings);
    setSkipDuplicates(shouldSkipDuplicates);
    setDefaultValues(confirmedDefaults);

    setWizardStep(4); // Transition to stepper loader

    // Fetch historical database state from localStorage to check duplicates
    const stored = localStorage.getItem('groweasy_import_history');
    const historyJobs = stored ? JSON.parse(stored) : [];
    
    const existingEmails: string[] = [];
    const existingPhones: string[] = [];
    
    historyJobs.forEach((job: any) => {
      if (job.successfulRecords) {
        job.successfulRecords.forEach((rec: any) => {
          if (rec.email) existingEmails.push(rec.email.toLowerCase().trim());
          if (rec.mobile_without_country_code) existingPhones.push(rec.mobile_without_country_code.trim());
        });
      }
    });

    const apiKey = localStorage.getItem('user_gemini_key') || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['x-gemini-key'] = apiKey;
    }

    const indexedRows = localRows.map((row, index) => ({
      ...row,
      _rowIndex: index + 1,
    }));

    const BATCH_SIZE = 50;
    let index = currentBatchIndex;
    
    let localStats = {
      importedCount: processingStats.importedCount,
      skippedCount: processingStats.skippedCount,
      failedCount: processingStats.failedCount,
      duplicateCount: processingStats.duplicateCount,
      status: 'processing' as const,
    };
    
    let successRecords = [...accumulatedSuccess];
    let failedRecords = [...accumulatedFailed];

    setProcessingStats({ ...localStats, status: 'processing' });

    try {
      // Loop through chunks of 50 rows sequentially in the browser
      while (index * BATCH_SIZE < indexedRows.length) {
        const chunk = indexedRows.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE);
        
        const response = await fetch('/api/process', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jobId,
            rows: chunk,
            mappings: confirmedMappings,
            skipDuplicates: shouldSkipDuplicates,
            existingEmails,
            existingPhones,
            defaultValues: confirmedDefaults,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Failed processing batch index ${index + 1}`);
        }

        // Accumulate statistics
        localStats.importedCount += result.importedCount || 0;
        localStats.skippedCount += result.skippedCount || 0;
        localStats.failedCount += result.failedCount || 0;
        localStats.duplicateCount += result.duplicateCount || 0;
        
        successRecords = [...successRecords, ...(result.successfulRecords || [])];
        failedRecords = [...failedRecords, ...(result.failedRecords || [])];

        setProcessingStats({ ...localStats });
        setAccumulatedSuccess(successRecords);
        setAccumulatedFailed(failedRecords);

        index++;
        setCurrentBatchIndex(index);
      }

      // Loop completed successfully! Compile charts status and source distributions
      const statusDistribution: Record<string, number> = {
        GOOD_LEAD_FOLLOW_UP: 0,
        DID_NOT_CONNECT: 0,
        BAD_LEAD: 0,
        SALE_DONE: 0,
      };

      const sourceDistribution: Record<string, number> = {
        leads_on_demand: 0,
        meridian_tower: 0,
        eden_park: 0,
        varah_swamy: 0,
        sarjapur_plots: 0,
      };

      successRecords.forEach((rec: any) => {
        const stat = rec.crm_status || 'GOOD_LEAD_FOLLOW_UP';
        const src = rec.data_source || 'leads_on_demand';
        if (statusDistribution[stat] !== undefined) statusDistribution[stat]++;
        if (sourceDistribution[src] !== undefined) sourceDistribution[src]++;
      });

      // Save run metadata and distributions directly inside localStorage history
      const shouldStoreRawRecords = indexedRows.length < 2000;
      const newHistoryJob = {
        id: jobId,
        fileName,
        fileSize,
        uploadedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        status: 'completed',
        totalRecords: indexedRows.length,
        importedCount: localStats.importedCount,
        skippedCount: localStats.skippedCount,
        failedCount: localStats.failedCount,
        duplicate_count: localStats.duplicateCount,
        statusDistribution,
        sourceDistribution,
        successfulRecords: shouldStoreRawRecords ? successRecords : [],
        failedRecords: shouldStoreRawRecords ? failedRecords : [],
      };

      const updatedHistory = [newHistoryJob, ...historyJobs];
      localStorage.setItem('groweasy_import_history', JSON.stringify(updatedHistory));

      setProcessingStats({ ...localStats, status: 'completed' });
      
      setProcessingResults({
        importedCount: localStats.importedCount,
        skippedCount: localStats.skippedCount,
        failedCount: localStats.failedCount,
        duplicate_count: localStats.duplicateCount,
        totalRecords: indexedRows.length,
        successfulRecords: successRecords,
        failedRecords: failedRecords,
      });

      // Reset progress pointers for subsequent imports
      setCurrentBatchIndex(0);
      setAccumulatedSuccess([]);
      setAccumulatedFailed([]);
      
      setWizardStep(5); // Go to Results Step
      toast.success('Leads clean import pipeline finished successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Connection dropped during batch cleaning.');
      setProcessingStats((prev) => ({ ...prev, status: 'failed' }));
    }
  };

  // Rendering Steps Professional Workflow Navigator
  const renderWorkflowNavigator = () => {
    const steps = [
      { num: 1, label: 'Upload CSV', icon: Upload },
      { num: 2, label: 'Preview', icon: Table },
      { num: 3, label: 'AI Mapping', icon: Map },
      { num: 4, label: 'AI Processing', icon: Loader2 },
      { num: 5, label: 'Import Results', icon: BarChart2 },
    ];

    return (
      <nav className="relative border-b border-zinc-200 bg-zinc-50/50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/30 md:px-6">
        <div className="mx-auto max-w-4xl flex items-center justify-between relative z-10">
          {/* Progress Connector Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-800 -translate-y-1/2 -z-10 hidden md:block" />

          {steps.map((s, idx) => {
            const isCompleted = wizardStep > s.num;
            const isActive = wizardStep === s.num;
            const StepIcon = s.icon;

            return (
              <div
                key={s.num}
                className="flex flex-col items-center gap-1.5 md:flex-row md:gap-2.5 bg-zinc-50/90 dark:bg-zinc-950/90 px-3 py-1 rounded-full relative"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-4 ring-indigo-500/20'
                      : 'bg-white border-zinc-250 text-zinc-400 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-650'
                  }`}
                >
                  {isCompleted ? (
                    <span className="text-xs font-bold">✓</span>
                  ) : (
                    <StepIcon className={`h-4 w-4 ${isActive ? 'animate-pulse' : ''}`} />
                  )}
                </div>
                <div className="text-center md:text-left">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : isCompleted
                        ? 'text-emerald-600 dark:text-emerald-500'
                        : 'text-zinc-400'
                    }`}
                  >
                    Step {s.num}
                  </p>
                  <p
                    className={`text-xs font-bold whitespace-nowrap ${
                      isActive
                        ? 'text-zinc-900 dark:text-white font-extrabold'
                        : isCompleted
                        ? 'text-zinc-700 dark:text-zinc-300'
                        : 'text-zinc-450 dark:text-zinc-600'
                    }`}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </nav>
    );
  };

  // Central Sticky Action Bar
  const renderStickyActionBar = () => {
    // Step 1: Upload (has internal trigger on file drop, no sticky bar needed)
    if (wizardStep === 1) return null;

    // Step 4: Processing (stateless progress screen, has no footer navigation unless crashed)
    if (wizardStep === 4) {
      if (processingStats.status !== 'failed') return null;
      return (
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-zinc-200/80 p-4 dark:bg-zinc-950/80 dark:border-zinc-800/80 flex items-center justify-center z-20 rounded-b-2xl">
          <Button
            onClick={() => handleStartProcessing(mappings, skipDuplicates, defaultValues)}
            className="h-12 px-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 hover:scale-105 active:scale-95 text-xs tracking-wider"
          >
            Retry Batch Processing
          </Button>
        </div>
      );
    }

    return (
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-zinc-200/80 p-4 dark:bg-zinc-950/80 dark:border-zinc-800/80 flex items-center justify-between z-20 rounded-b-2xl">
        {/* Left Side: Back / Cancel */}
        {wizardStep === 5 ? (
          <Button
            variant="ghost"
            onClick={handleStartImport}
            className="h-12 px-6 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-550 dark:text-zinc-400 font-semibold text-xs transition-colors"
          >
            Import Another File
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setWizardStep(wizardStep - 1)}
            className="h-12 px-6 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-550 dark:text-zinc-400 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}

        {/* Right Side: Primary CTA */}
        {wizardStep === 2 && (
          <Button
            onClick={() => setWizardStep(3)}
            className="h-12 px-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg hover:shadow-indigo-550/25 transition-all duration-200 hover:scale-105 active:scale-95 text-xs flex items-center gap-1.5"
          >
            Confirm & Map Columns
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {wizardStep === 3 && (
          <Button
            onClick={() => {
              if (triggerProcessSubmit) {
                triggerProcessSubmit();
              }
            }}
            className="h-12 px-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg hover:shadow-indigo-550/25 transition-all duration-200 hover:scale-105 active:scale-95 text-xs flex items-center gap-1.5"
          >
            Process Import
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {wizardStep === 5 && (
          <Button
            onClick={() => setViewMode('dashboard')}
            className="h-12 px-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg hover:shadow-indigo-550/25 transition-all duration-200 hover:scale-105 active:scale-95 text-xs flex items-center gap-1.5"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black antialiased">
      {/* Global Toast Notifier */}
      <Toaster position="top-right" richColors theme="system" closeButton />

      {/* Main Top Header */}
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {viewMode === 'dashboard' ? (
          <Dashboard onStartImport={handleStartImport} />
        ) : (
          /* Premium Glassmorphism Wizard Box */
          <Card className="overflow-hidden border border-zinc-200/80 bg-white/70 shadow-xl backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/70 rounded-2xl animate-in fade-in zoom-in-95 duration-300 min-h-[550px] flex flex-col justify-between">
            <div>
              {/* Stepper Navigator */}
              {renderWorkflowNavigator()}

              {/* Step Main Body */}
              <div className="p-6 md:p-8">
                {wizardStep === 1 && (
                  <CSVUploadStep onUploadSuccess={handleUploadSuccess} />
                )}
                {wizardStep === 2 && (
                  <CSVPreviewStep
                    headers={headers}
                    rows={localRows}
                    suggestedMappings={suggestedMappings}
                    onNext={() => setWizardStep(3)}
                    onBack={() => setWizardStep(1)}
                  />
                )}
                {wizardStep === 3 && (
                  <MappingStep
                    csvHeaders={headers}
                    suggestedMappings={suggestedMappings}
                    onBack={() => setWizardStep(2)}
                    onProcess={handleStartProcessing}
                    registerSubmitTrigger={setTriggerProcessSubmit}
                  />
                )}
                {wizardStep === 4 && (
                  <ProcessingStep
                    stats={processingStats}
                    totalRecords={localRows.length}
                    onRetry={() => handleStartProcessing(mappings, skipDuplicates, defaultValues)}
                  />
                )}
                {wizardStep === 5 && (
                  <ResultsStep
                    fileName={fileName}
                    results={processingResults}
                    onFinish={() => setViewMode('dashboard')}
                    onReset={handleStartImport}
                  />
                )}
              </div>
            </div>

            {/* Central Sticky Action Bar */}
            {renderStickyActionBar()}
          </Card>
        )}
      </main>
    </div>
  );
}
