'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Check, X, ShieldAlert, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface MappingStepProps {
  csvHeaders: string[];
  suggestedMappings: Array<{
    crmField: string;
    csvColumn: string | null;
    confidence: number;
    rationale: string;
  }>;
  onBack: () => void;
  onProcess: (
    mappings: Record<string, string | null>,
    skipDuplicates: boolean,
    defaultValues: { lead_owner: string; crm_status: string; data_source: string }
  ) => void;
  registerSubmitTrigger?: (trigger: () => void) => void;
}

const CRM_FIELDS = [
  { key: 'name', label: 'Name', required: true, desc: 'Contact first/last name or full name' },
  { key: 'email', label: 'Email', required: false, desc: 'Primary email address' },
  { key: 'mobile_without_country_code', label: 'Mobile Number', required: false, desc: 'Phone/mobile number without country code' },
  { key: 'country_code', label: 'Country Code', required: false, desc: 'International dialing prefix (e.g. +91, 1)' },
  { key: 'company', label: 'Company Name', required: false, desc: 'Employer or organization name' },
  { key: 'city', label: 'City', required: false, desc: 'Residential/office city' },
  { key: 'state', label: 'State', required: false, desc: 'Residential/office state' },
  { key: 'country', label: 'Country', required: false, desc: 'Residential/office country' },
  { key: 'possession_time', label: 'Possession Time', required: false, desc: 'Property possession timeline' },
  { key: 'description', label: 'Description', required: false, desc: 'Requirements details or comments' },
  { key: 'crm_note', label: 'Notes', required: false, desc: 'Extra notes, multiple phone/emails' },
  { key: 'created_at', label: 'Created At', required: false, desc: 'Date/time lead was captured' },
] as const;

const STATUS_VALUES = [
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
];

const SOURCE_VALUES = [
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
];

export default function MappingStep({
  csvHeaders,
  suggestedMappings,
  onBack,
  onProcess,
  registerSubmitTrigger,
}: MappingStepProps) {
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [defaultOwner, setDefaultOwner] = useState('System Owner');
  const [defaultStatus, setDefaultStatus] = useState('GOOD_LEAD_FOLLOW_UP');
  const [defaultSource, setDefaultSource] = useState('leads_on_demand');

  useEffect(() => {
    const initialMappings: Record<string, string | null> = {};
    CRM_FIELDS.forEach((field) => {
      initialMappings[field.key] = null;
    });

    suggestedMappings.forEach((sug) => {
      if (sug.csvColumn && csvHeaders.includes(sug.csvColumn)) {
        initialMappings[sug.crmField] = sug.csvColumn;
      }
    });

    setMappings(initialMappings);
  }, [suggestedMappings, csvHeaders]);

  const handleStartProcessing = () => {
    const isEmailMapped = !!mappings['email'];
    const isMobileMapped = !!mappings['mobile_without_country_code'];

    if (!isEmailMapped && !isMobileMapped) {
      toast.warning('Neither Email nor Mobile Number is mapped. Records lacking both will be skipped.');
    }

    onProcess(mappings, skipDuplicates, {
      lead_owner: defaultOwner,
      crm_status: defaultStatus,
      data_source: defaultSource,
    });
  };

  // Register the processing submit trigger to parent sticky action bar
  useEffect(() => {
    if (registerSubmitTrigger) {
      registerSubmitTrigger(() => {
        handleStartProcessing();
      });
    }
  }, [registerSubmitTrigger, mappings, skipDuplicates, defaultOwner, defaultStatus, defaultSource]);

  const handleMappingChange = (crmField: string, csvColumn: string) => {
    setMappings((prev) => ({
      ...prev,
      [crmField]: csvColumn === '__null__' ? null : csvColumn,
    }));
  };

  const getSuggestionDetails = (fieldKey: string) => {
    return suggestedMappings.find((sug) => sug.crmField === fieldKey);
  };

  return (
    <div className="space-y-8">
      <div className="animate-in fade-in duration-300">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500 fill-indigo-500/20" />
          AI Mapping & Defaults configuration
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Verify Gemini mapping recommendations, toggle duplicate policies, and configure fallbacks.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Core mappings column */}
        <div className="space-y-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-805 dark:text-zinc-200">
            Column Mapping Configuration
          </h3>

          <div className="space-y-3">
            {CRM_FIELDS.map((field) => {
              const currentMappedValue = mappings[field.key] || '__null__';
              const suggestion = getSuggestionDetails(field.key);
              const confidence = suggestion?.confidence || 0;
              const rationale = suggestion?.rationale || '';

              return (
                <Card
                  key={field.key}
                  className={`border transition-all duration-200 bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50 hover:shadow-md hover:-translate-y-0.5 ${
                    currentMappedValue !== '__null__'
                      ? 'border-indigo-200 dark:border-indigo-500/25 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      {/* Field Meta */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-zinc-850 dark:text-zinc-200">
                            {field.label}
                          </span>
                          {field.required && (
                            <Badge variant="outline" className="text-[9px] h-4.5 bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-450">
                              Required
                            </Badge>
                          )}
                          {field.required && currentMappedValue === '__null__' && (
                            <Badge variant="outline" className="text-[9px] h-4.5 bg-rose-500/5 border-rose-500/20 text-rose-605 dark:text-rose-450 animate-pulse font-bold">
                              ⚠️ Unmapped Required Field
                            </Badge>
                          )}
                          {currentMappedValue !== '__null__' && confidence > 0 && (
                            <Badge
                              variant="outline"
                              className={`text-[9px] h-4.5 ${
                                confidence >= 80
                                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-450'
                              }`}
                            >
                              AI: {confidence}% match
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-relaxed">
                          {field.desc}
                        </p>
                      </div>

                      {/* Dropdown selection */}
                      <div className="flex items-center gap-2 min-w-[200px] shrink-0 sm:self-center">
                        <ArrowRight className="hidden sm:block h-3.5 w-3.5 text-zinc-350 dark:text-zinc-650" />
                        <select
                          value={currentMappedValue}
                          onChange={(e) => handleMappingChange(field.key, e.target.value)}
                          className="w-full text-xs font-semibold rounded-xl border border-zinc-250 bg-white px-3 py-2 text-zinc-700 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-350"
                        >
                          <option value="__null__">-- Ignore this column --</option>
                          {csvHeaders.map((header, idx) => (
                            <option key={idx} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* AI Mapping confidence progress bars */}
                    {currentMappedValue !== '__null__' && (
                      <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-850/60 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-650 dark:text-zinc-350">
                          <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                            {currentMappedValue} → {field.label}
                          </span>
                          <span>{confidence}% match</span>
                        </div>
                        {confidence > 0 && (
                          <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                confidence >= 90
                                  ? 'bg-emerald-500'
                                  : confidence >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                        )}
                        {rationale && (
                          <p className="text-[10px] text-indigo-650 dark:text-indigo-400 leading-relaxed">
                            <span className="font-semibold">Why mapped?</span> "{rationale}"
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Default configs & Policy column */}
        <div className="space-y-6">
          {/* Duplicate checks policy toggle card */}
          <Card className="border border-indigo-100 bg-indigo-500/5 dark:border-indigo-550/15 p-5 space-y-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-650 dark:text-indigo-400 font-mono">Duplicate Check Policy</span>
              <button
                onClick={() => setSkipDuplicates(!skipDuplicates)}
                className="text-indigo-650 hover:opacity-85 transition-opacity"
              >
                {skipDuplicates ? (
                  <ToggleRight className="h-9 w-9 text-indigo-600" />
                ) : (
                  <ToggleLeft className="h-9 w-9 text-zinc-400" />
                )}
              </button>
            </div>
            
            <div className="space-y-1.5 text-xs text-indigo-650 dark:text-indigo-300">
              <span className="font-bold flex items-center gap-1.5">
                {skipDuplicates ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {skipDuplicates ? 'Skip duplicate records' : 'Import duplicate records anyway'}
              </span>
              <p className="text-[9.5px] leading-relaxed text-zinc-500 dark:text-zinc-450">
                Matches are determined by comparing phone numbers and email addresses against the entire CRM database and the uploaded file itself.
              </p>
            </div>
          </Card>

          {/* Defaults configurations */}
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/30">
            <h3 className="text-sm font-semibold text-zinc-850 dark:text-zinc-150">
              Import Default Fallbacks
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Lead Owner
                </label>
                <input
                  type="text"
                  value={defaultOwner}
                  onChange={(e) => setDefaultOwner(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-250 bg-white px-3 py-2 text-zinc-750 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                  placeholder="System Owner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Default CRM Status
                </label>
                <select
                  value={defaultStatus}
                  onChange={(e) => setDefaultStatus(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-250 bg-white px-3 py-2 text-zinc-750 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                >
                  {STATUS_VALUES.map((val) => (
                    <option key={val} value={val}>
                      {val.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Default Data Source
                </label>
                <select
                  value={defaultSource}
                  onChange={(e) => setDefaultSource(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-250 bg-white px-3 py-2 text-zinc-755 outline-none dark:border-zinc-800 dark:bg-zinc-955 dark:text-zinc-300"
                >
                  {SOURCE_VALUES.map((val) => (
                    <option key={val} value={val}>
                      {val.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Guidelines Box */}
          <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-400 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
              <span>CRM Validation Guardrails</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[9.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              <li>Record must contain either an email or mobile phone.</li>
              <li>Duplicates and syntax checks apply in batches.</li>
              <li>Leads failing basic format checks are saved to failure logs.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
