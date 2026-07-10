'use client';

import React, { useEffect, useState } from 'react';
import { Database, Upload, History, Calendar, FileSpreadsheet, Download, RefreshCw, BarChart4, PieChart, TrendingUp, CircleAlert, Trash2, ShieldAlert, Award, AlertTriangle, Layers, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { BarChart, DonutChart, LineChart } from './ui/chart';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface DashboardProps {
  onStartImport: () => void;
}

export default function Dashboard({ onStartImport }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    metrics: {
      totalImports: 0,
      totalUploaded: 0,
      totalImported: 0,
      totalSkipped: 0,
      totalFailed: 0,
      totalDuplicates: 0,
      aiMappingAccuracy: 0,
      importSuccessRate: 0,
    },
    statusDistribution: {
      GOOD_LEAD_FOLLOW_UP: 0,
      DID_NOT_CONNECT: 0,
      BAD_LEAD: 0,
      SALE_DONE: 0,
    },
    sourceDistribution: {
      leads_on_demand: 0,
      meridian_tower: 0,
      eden_park: 0,
      varah_swamy: 0,
      sarjapur_plots: 0,
    },
    timeSeriesData: [],
  });

  const loadDataFromLocalStorage = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem('groweasy_import_history');
      const jobs = stored ? JSON.parse(stored) : [];
      setHistory(jobs);

      // Aggregate statistics from localStorage metadata
      const totalImports = jobs.length;
      const totalUploaded = jobs.reduce((acc: number, curr: any) => acc + (curr.totalRecords || 0), 0);
      const totalImported = jobs.reduce((acc: number, curr: any) => acc + (curr.importedCount || 0), 0);
      const totalSkipped = jobs.reduce((acc: number, curr: any) => acc + (curr.skippedCount || 0), 0);
      const totalFailed = jobs.reduce((acc: number, curr: any) => acc + (curr.failedCount || 0), 0);
      const totalDuplicates = jobs.reduce((acc: number, curr: any) => acc + (curr.duplicate_count || 0), 0);

      // Recalculate distinct indicators
      const validRecords = totalUploaded - totalFailed;
      const aiMappingAccuracy = totalUploaded > 0 ? Math.round((validRecords / totalUploaded) * 100) : 0;
      const importSuccessRate = validRecords > 0 ? Math.round((totalImported / validRecords) * 100) : 0;

      const statusDistribution = {
        GOOD_LEAD_FOLLOW_UP: 0,
        DID_NOT_CONNECT: 0,
        BAD_LEAD: 0,
        SALE_DONE: 0,
      };

      const sourceDistribution = {
        leads_on_demand: 0,
        meridian_tower: 0,
        eden_park: 0,
        varah_swamy: 0,
        sarjapur_plots: 0,
      };

      // Sum distributions from jobs metadata
      jobs.forEach((job: any) => {
        if (job.statusDistribution) {
          Object.keys(statusDistribution).forEach((key) => {
            statusDistribution[key as keyof typeof statusDistribution] +=
              job.statusDistribution[key] || 0;
          });
        }
        if (job.sourceDistribution) {
          Object.keys(sourceDistribution).forEach((key) => {
            sourceDistribution[key as keyof typeof sourceDistribution] +=
              job.sourceDistribution[key] || 0;
          });
        }
      });

      // Compile line chart date trends
      const historyOverTime: Record<string, { imported: number; failed: number }> = {};
      jobs.forEach((job: any) => {
        const dateStr = job.processedAt ? job.processedAt.split('T')[0] : job.uploadedAt.split('T')[0];
        if (!historyOverTime[dateStr]) {
          historyOverTime[dateStr] = { imported: 0, failed: 0 };
        }
        historyOverTime[dateStr].imported += job.importedCount || 0;
        historyOverTime[dateStr].failed += (job.failedCount || 0) + (job.skippedCount || 0);
      });

      const timeSeriesData = Object.entries(historyOverTime)
        .map(([date, counts]) => ({
          date,
          imported: counts.imported,
          failed: counts.failed,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7);

      setAnalytics({
        metrics: {
          totalImports,
          totalUploaded,
          totalImported,
          totalSkipped,
          totalFailed,
          totalDuplicates,
          aiMappingAccuracy,
          importSuccessRate,
        },
        statusDistribution,
        sourceDistribution,
        timeSeriesData,
      });
    } catch (err) {
      console.error('Failed to parse localStorage history:', err);
      toast.error('Error loading history logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromLocalStorage();
  }, []);

  const handleDeleteHistoryItem = (id: string, fileName: string) => {
    // Accident deletion guardrail
    const confirmDelete = window.confirm(`Are you sure you want to delete the import history for "${fileName}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const stored = localStorage.getItem('groweasy_import_history');
      const jobs = stored ? JSON.parse(stored) : [];
      const updated = jobs.filter((j: any) => j.id !== id);
      localStorage.setItem('groweasy_import_history', JSON.stringify(updated));
      loadDataFromLocalStorage();
      toast.success(`Removed "${fileName}" run from history list.`);
    } catch (err) {
      toast.error('Failed to delete history item.');
    }
  };

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

  const handleDownloadLocal = (job: any, type: 'success' | 'failed') => {
    const list = type === 'success' ? job.successfulRecords : job.failedRecords;

    if (!list || list.length === 0) {
      toast.warning(`No raw records stored for this run. (Large logs are cleared to save storage)`);
      return;
    }

    try {
      let csvContent = '';
      if (type === 'success') {
        const cleanList = list.map(({ import_id, ...r }: any) => r);
        csvContent = convertJSONToCSV(cleanList);
      } else {
        const flattened = list.map((item: any) => ({
          row_index: item.row_index,
          status: item.status,
          reason: item.reason,
          ...(item.raw_data || {})
        }));
        csvContent = convertJSONToCSV(flattened);
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${type}_leads_${job.fileName}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded ${type} CSV`);
    } catch (err) {
      toast.error('CSV compilation failed.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const metrics = analytics.metrics;

  const statusChartData = [
    { label: 'Good Lead Follow Up', value: analytics.statusDistribution.GOOD_LEAD_FOLLOW_UP, colorClass: 'bg-emerald-500' },
    { label: 'Did Not Connect', value: analytics.statusDistribution.DID_NOT_CONNECT, colorClass: 'bg-amber-500' },
    { label: 'Bad Lead', value: analytics.statusDistribution.BAD_LEAD, colorClass: 'bg-rose-500' },
    { label: 'Sale Done', value: analytics.statusDistribution.SALE_DONE, colorClass: 'bg-indigo-500' },
  ];

  const sourceChartData = [
    { label: 'Leads On Demand', value: analytics.sourceDistribution.leads_on_demand },
    { label: 'Meridian Tower', value: analytics.sourceDistribution.meridian_tower },
    { label: 'Eden Park', value: analytics.sourceDistribution.eden_park },
    { label: 'Varah Swamy', value: analytics.sourceDistribution.varah_swamy },
    { label: 'Sarjapur Plots', value: analytics.sourceDistribution.sarjapur_plots },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            GrowEasy Leads Import Hub
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Monitor real-time analytics compiled from stateless session runs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={loadDataFromLocalStorage}
            className="rounded-xl h-10 w-10 border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            aria-label="Refresh Dashboard Metrics"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={onStartImport}
            className="h-12 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-indigo-700 hover:to-indigo-700 text-white font-bold flex items-center gap-2 shadow-lg hover:shadow-indigo-550/25 transition-all duration-200 hover:scale-105 active:scale-95 text-xs"
            aria-label="Import New Leads"
          >
            <Upload className="h-4.5 w-4.5" />
            Import New Leads
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="h-10 w-10 animate-spin text-indigo-500" />
          <span className="text-sm font-semibold text-zinc-500">Querying session history...</span>
        </div>
      ) : (
        <>
          {/* Quick Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 animate-in fade-in duration-500">
            {/* Total Processed Rows */}
            <Card className="border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Processed Rows</span>
                  <Database className="h-4 w-4 text-violet-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-zinc-855 dark:text-white">{metrics.totalUploaded}</span>
                  <span className="text-[10px] text-zinc-455">rows</span>
                </div>
              </CardContent>
            </Card>

            {/* AI Mapping Accuracy */}
            <Card className="border border-indigo-150/40 bg-indigo-500/5 hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl dark:border-indigo-950/40">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-indigo-650 dark:text-indigo-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">AI Mapping Accuracy</span>
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-indigo-500" />
                    <div className="relative group">
                      <Info className="h-3.5 w-3.5 text-zinc-400 hover:text-indigo-500 cursor-help" />
                      <div className="absolute right-0 top-6 scale-0 group-hover:scale-100 transition-all origin-top-right bg-zinc-900/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-850 text-zinc-200 dark:text-zinc-300 text-[10px] p-2.5 rounded-xl w-52 shadow-lg z-50 font-medium leading-relaxed backdrop-blur-md">
                        Measures AI data structuring success. Calculated as (Total Rows - Invalid Rows) / Total Rows. Duplicates do NOT penalize this metric.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-605 dark:text-indigo-400">{metrics.aiMappingAccuracy}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Import Success Rate */}
            <Card className="border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Import Success Rate</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-indigo-505" />
                    <div className="relative group">
                      <Info className="h-3.5 w-3.5 text-zinc-400 hover:text-indigo-505 cursor-help" />
                      <div className="absolute right-0 top-6 scale-0 group-hover:scale-100 transition-all origin-top-right bg-zinc-900/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-850 text-zinc-200 dark:text-zinc-300 text-[10px] p-2.5 rounded-xl w-52 shadow-lg z-50 font-medium leading-relaxed backdrop-blur-md">
                        Proportion of valid records written to the CRM database after screening duplicates.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-zinc-855 dark:text-white">{metrics.importSuccessRate}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Imported Leads */}
            <Card className="border border-emerald-150/40 bg-emerald-500/5 hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl dark:border-emerald-950/40">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-450">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Imported Leads</span>
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-emerald-500" />
                    <div className="relative group">
                      <Info className="h-3.5 w-3.5 text-zinc-400 hover:text-emerald-500 cursor-help" />
                      <div className="absolute right-0 top-6 scale-0 group-hover:scale-100 transition-all origin-top-right bg-zinc-900/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-850 text-zinc-200 dark:text-zinc-300 text-[10px] p-2.5 rounded-xl w-52 shadow-lg z-50 font-medium leading-relaxed backdrop-blur-md">
                        Total leads successfully validated, cleaned, and written into the CRM.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.totalImported}</span>
                  <span className="text-[10px] text-zinc-455">leads</span>
                </div>
              </CardContent>
            </Card>

            {/* Duplicate Count */}
            <Card className="border border-amber-150/40 bg-amber-500/5 hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl dark:border-amber-950/40">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Duplicates</span>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-550" />
                    <div className="relative group">
                      <Info className="h-3.5 w-3.5 text-zinc-405 hover:text-amber-500 cursor-help" />
                      <div className="absolute right-0 top-6 scale-0 group-hover:scale-100 transition-all origin-top-right bg-zinc-900/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-850 text-zinc-200 dark:text-zinc-300 text-[10px] p-2.5 rounded-xl w-52 shadow-lg z-50 font-medium leading-relaxed backdrop-blur-md">
                        Skipped rows matching existing CRM contacts. This is a duplicate policy rule, not an AI error.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.totalDuplicates}</span>
                  <span className="text-[10px] text-zinc-455">rows</span>
                </div>
              </CardContent>
            </Card>

            {/* Invalid Records (Failed validation checks) */}
            <Card className="border border-rose-150/40 bg-rose-500/5 hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl dark:border-rose-950/40">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-rose-600 dark:text-rose-455">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Invalid Records</span>
                  <div className="flex items-center gap-1">
                    <CircleAlert className="h-4 w-4 text-rose-500" />
                    <div className="relative group">
                      <Info className="h-3.5 w-3.5 text-zinc-400 hover:text-rose-500 cursor-help" />
                      <div className="absolute right-0 top-6 scale-0 group-hover:scale-100 transition-all origin-top-right bg-zinc-900/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-850 text-zinc-200 dark:text-zinc-300 text-[10px] p-2.5 rounded-xl w-52 shadow-lg z-50 font-medium leading-relaxed backdrop-blur-md">
                        Records rejected during parsing/ingestion due to missing Name or validation error formats.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-455">{metrics.totalFailed}</span>
                  <span className="text-[10px] text-zinc-455">rows</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aggregated Analytics Graphs */}
          {metrics.totalUploaded > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-500">
              {/* Line chart: Historical trends */}
              <Card className="border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 p-5 col-span-1 md:col-span-2 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-1.5 mb-6 text-zinc-800 dark:text-zinc-200">
                  <TrendingUp className="h-4.5 w-4.5 text-indigo-550" />
                  <span className="text-sm font-semibold">Leads Import Volume Trend</span>
                </div>
                <LineChart data={analytics.timeSeriesData} height={220} />
              </Card>

              {/* Donut chart: Status distribution */}
              <Card className="border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-1.5 mb-6 text-zinc-800 dark:text-zinc-200">
                  <PieChart className="h-4.5 w-4.5 text-indigo-550" />
                  <span className="text-sm font-semibold">CRM Status Breakdown</span>
                </div>
                <DonutChart data={statusChartData} height={220} />
              </Card>

              {/* Bar chart: Source distribution */}
              <Card className="border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 p-5 col-span-1 md:col-span-2 lg:col-span-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-1.5 mb-6 text-zinc-800 dark:text-zinc-200">
                  <BarChart4 className="h-4.5 w-4.5 text-indigo-555" />
                  <span className="text-sm font-semibold">Campaign Project Sources</span>
                </div>
                <BarChart data={sourceChartData} color="from-indigo-500 to-indigo-650" height={200} />
              </Card>
            </div>
          ) : (
            /* Premium Illustration Empty State */
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/30 max-w-lg mx-auto py-16 gap-5 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-600">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-extrabold text-zinc-800 dark:text-zinc-150">📂 No Imports Yet</h3>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">
                  Analyze and clean campaign leads immediately. Upload your first CSV file to populate dashboard graphs.
                </p>
              </div>
              <Button
                onClick={onStartImport}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:scale-105 transition-all text-xs font-bold shadow-md shadow-indigo-500/10"
              >
                Import Leads File
              </Button>
            </div>
          )}

          {/* GrowEasy CRM Leads Schema Reference Guide for first-time users */}
          <Card className="border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 p-5 rounded-2xl shadow-sm animate-in fade-in duration-500">
            <h3 className="text-sm font-bold text-zinc-850 dark:text-zinc-200 mb-2 flex items-center gap-1.5">
              <Info className="h-4.5 w-4.5 text-indigo-500" />
              GrowEasy CRM Lead Schema Reference Guide
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
              Before importing leads, familiarize yourself with our core target CRM fields. The AI maps columns and filters out incomplete contacts automatically.
            </p>
            
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-3 bg-white/60 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/50 dark:border-zinc-850 space-y-1">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Full Name</span>
                <Badge className="bg-rose-500/10 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[8px] h-4.5 font-bold uppercase tracking-wider font-mono">Required</Badge>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-450 leading-relaxed">The main identifier of the lead. Mappings to this column cannot contain empty cells.</p>
              </div>

              <div className="p-3 bg-white/60 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/50 dark:border-zinc-850 space-y-1">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">Email / Mobile</span>
                <Badge className="bg-amber-500/10 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] h-4.5 font-bold uppercase tracking-wider font-mono">Required Contact</Badge>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-450 leading-relaxed">Leads must contain either an email address or phone digits. Rows lacking both will be skipped.</p>
              </div>

              <div className="p-3 bg-white/60 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/50 dark:border-zinc-850 space-y-1">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">CRM Status</span>
                <Badge className="bg-zinc-100 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 text-[8px] h-4.5 font-bold font-mono">Enum Options</Badge>
                <p className="text-[9.5px] text-zinc-500 dark:text-zinc-450 leading-normal font-mono pt-0.5">
                  GOOD_LEAD_FOLLOW_UP<br />
                  DID_NOT_CONNECT<br />
                  BAD_LEAD, SALE_DONE
                </p>
              </div>
            </div>
          </Card>

          {/* Import Runs History Table */}
          {history.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-zinc-850 dark:text-white">Import History Logs</h2>
              </div>

              <Card className="overflow-hidden border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50 rounded-2xl shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs text-zinc-500 dark:text-zinc-400">
                      <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/80">
                        <tr>
                          <th className="px-4 py-3.5 font-bold text-zinc-850 dark:text-zinc-300">Run Date</th>
                          <th className="px-4 py-3.5 font-bold text-zinc-850 dark:text-zinc-300">File Name</th>
                          <th className="px-4 py-3.5 font-bold text-zinc-850 dark:text-zinc-300">Size</th>
                          <th className="px-4 py-3.5 font-bold text-zinc-850 dark:text-zinc-300 text-center">Total Rows</th>
                          <th className="px-4 py-3.5 font-bold text-zinc-850 dark:text-zinc-300 text-center">Imported</th>
                          <th className="px-4 py-3.5 font-bold text-zinc-850 dark:text-zinc-300 text-center">Duplicates</th>
                          <th className="px-4 py-3.5 font-bold text-zinc-850 dark:text-zinc-300 text-center">Failed</th>
                          <th className="px-4 py-3.5 font-bold text-zinc-850 dark:text-zinc-300">Status</th>
                          <th className="px-4 py-3.5 font-bold text-zinc-850 dark:text-zinc-300 text-center">Downloads</th>
                          <th className="px-4 py-3.5 font-bold text-zinc-850 dark:text-zinc-300 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                        {history.map((imp: any) => {
                          const dateObj = new Date(imp.uploadedAt);
                          const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const hasLocalData = (imp.successfulRecords && imp.successfulRecords.length > 0) || (imp.failedRecords && imp.failedRecords.length > 0);

                          return (
                            <tr
                              key={imp.id}
                              className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/25 transition-colors"
                            >
                              <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-zinc-405" />
                                  {formattedDate}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-zinc-805 dark:text-zinc-200 max-w-[180px] truncate">
                                <span className="flex items-center gap-1.5">
                                  <FileSpreadsheet className="h-4 w-4 text-indigo-500 shrink-0" />
                                  {imp.fileName}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-zinc-455 dark:text-zinc-550 whitespace-nowrap">
                                {formatBytes(imp.fileSize)}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-zinc-800 dark:text-zinc-200">
                                {imp.totalRecords}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                {imp.importedCount}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-amber-500">
                                {imp.duplicate_count || 0}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-rose-505">
                                {imp.failedCount}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                >
                                  COMPLETED
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                {hasLocalData ? (
                                  <div className="flex justify-center gap-1.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={!imp.successfulRecords || imp.successfulRecords.length === 0}
                                      onClick={() => handleDownloadLocal(imp, 'success')}
                                      className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                      title="Download successfully imported leads"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={!imp.failedRecords || imp.failedRecords.length === 0}
                                      onClick={() => handleDownloadLocal(imp, 'failed')}
                                      className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                      title="Download failed leads diagnostics"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-zinc-400 italic">CSV Expired</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteHistoryItem(imp.id, imp.fileName)}
                                  className="h-8 w-8 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                  title="Delete import log"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
