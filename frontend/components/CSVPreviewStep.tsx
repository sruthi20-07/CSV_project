'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Table, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { validateCSVRow } from '../lib/validation';

interface CSVPreviewStepProps {
  headers: string[];
  rows: any[];
  suggestedMappings: Array<{
    crmField: string;
    csvColumn: string | null;
  }>;
  onNext: () => void;
  onBack: () => void;
}

export default function CSVPreviewStep({
  headers,
  rows,
  suggestedMappings,
  onNext,
  onBack,
}: CSVPreviewStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Discover columns mapped by Gemini to run syntax check
  const nameCol = suggestedMappings.find((m) => m.crmField === 'name')?.csvColumn;
  const emailCol = suggestedMappings.find((m) => m.crmField === 'email')?.csvColumn;
  const phoneCol = suggestedMappings.find((m) => m.crmField === 'mobile_without_country_code')?.csvColumn;

  // Run local client-side validation logic
  const getValidationErrors = (row: any) => {
    return validateCSVRow(row, nameCol, emailCol, phoneCol).errors;
  };

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const lowerSearch = searchTerm.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(lowerSearch)
      )
    );
  }, [rows, searchTerm]);

  // Paginate rows
  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Preview Uploaded Data
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Pre-import validation badges have been assigned based on detected field patterns.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-xs sm:w-80">
          <Search className="absolute top-2.5 left-3 h-4.5 w-4.5 text-zinc-400" />
          <Input
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
            className="rounded-xl border-zinc-200 bg-white pl-9 dark:border-zinc-800 dark:bg-zinc-950"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl bg-indigo-500/5 px-3 py-1.5 border border-indigo-500/10 text-xs font-semibold text-indigo-650 dark:text-indigo-400">
          <Table className="h-4 w-4" />
          <span>{rows.length} CSV Rows</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-indigo-500/5 px-3 py-1.5 border border-indigo-500/10 text-xs font-semibold text-indigo-650 dark:text-indigo-400">
          <span>{headers.length} Headers</span>
        </div>
      </div>

      {/* Preview Table */}
      <Card className="overflow-hidden border border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50">
        <CardContent className="p-0">
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full border-collapse text-left text-xs text-zinc-500 dark:text-zinc-400">
              <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-200">#</th>
                  <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-200">Validation Status</th>
                  {headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-200 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row, rIdx) => {
                    const originalIndex = currentPage * pageSize + rIdx + 1;
                    const errors = getValidationErrors(row);

                    return (
                      <tr
                        key={rIdx}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-4 py-2 font-medium text-zinc-400 dark:text-zinc-500">
                          {originalIndex}
                        </td>
                        {/* Validation badges column */}
                        <td className="px-4 py-2 whitespace-nowrap font-medium">
                          {errors.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              <CheckCircle className="h-3 w-3" />
                              Valid Lead
                            </span>
                          ) : (
                            <div className="flex gap-1 flex-wrap">
                              {errors.map((err) => (
                                <Badge
                                  key={err}
                                  variant="outline"
                                  className={`text-[9px] h-5 font-bold ${
                                    err.startsWith('MISSING_REQUIRED')
                                      ? 'bg-rose-500/5 border-rose-500/30 text-rose-750 dark:text-rose-400'
                                      : err.startsWith('MISSING_CONTACT')
                                      ? 'bg-zinc-500/5 border-zinc-500/30 text-zinc-750 dark:text-zinc-300'
                                      : 'bg-amber-500/5 border-amber-500/30 text-amber-750 dark:text-amber-400'
                                  }`}
                                >
                                  {err}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        {headers.map((header, hIdx) => (
                          <td key={hIdx} className="px-4 py-2 whitespace-nowrap">
                            {row[header] !== undefined && row[header] !== null
                              ? String(row[header])
                              : '-'}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={headers.length + 2}
                      className="py-12 text-center text-sm text-zinc-400"
                    >
                      No records matched search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-450">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, filteredRows.length)} of{' '}
            {filteredRows.length} entries
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="rounded-xl h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
              let pageIndex = idx;
              if (currentPage > 2 && totalPages > 5) {
                if (currentPage + 2 >= totalPages) {
                  pageIndex = totalPages - 5 + idx;
                } else {
                  pageIndex = currentPage - 2 + idx;
                }
              }
              return (
                <Button
                  key={idx}
                  variant={currentPage === pageIndex ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(pageIndex)}
                  className={`rounded-xl h-8 min-w-[32px] px-2 text-xs ${
                    currentPage === pageIndex
                      ? 'bg-indigo-650 text-white'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {pageIndex + 1}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              className="rounded-xl h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
