'use client';

import { useState, useRef, useId } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Layers,
  Sparkles,
  Users,
} from 'lucide-react';

export interface CsvContactImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (summary: { total: number; inserted: number; updated: number; failed: number }) => void;
}

type FieldTarget =
  | 'phone'
  | 'name'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'tag'
  | 'custom'
  | 'ignore';

interface ColumnMapping {
  csvHeader: string;
  target: FieldTarget;
  customKeyName?: string;
}

export default function CsvContactImporterModal({
  isOpen,
  onClose,
  onSuccess,
}: CsvContactImporterModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [defaultCountryCode, setDefaultCountryCode] = useState('91'); // India +91 by default
  const [defaultTag, setDefaultTag] = useState('CSV Import');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    totalProcessed: number;
    insertedCount: number;
    updatedCount: number;
    failedCount: number;
    errors: Array<{ row: number; phone?: string; reason: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Simple CSV text parser (handles quoted fields with commas)
  const parseCsvText = (text: string): string[][] => {
    const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
    return lines.map((line) => {
      const row: string[] = [];
      let inQuotes = false;
      let curVal = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(curVal.trim().replace(/^"|"$/g, ''));
          curVal = '';
        } else {
          curVal += char;
        }
      }
      row.push(curVal.trim().replace(/^"|"$/g, ''));
      return row;
    });
  };

  // Auto-detect mappings from header names
  const autoMapHeaders = (detectedHeaders: string[]): ColumnMapping[] => {
    return detectedHeaders.map((header) => {
      const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (['phone', 'mobile', 'whatsapp', 'contactnumber', 'wa', 'number', 'tel'].some((p) => h.includes(p))) {
        return { csvHeader: header, target: 'phone' };
      }
      if (['name', 'fullname', 'customername', 'profilename', 'contactname'].includes(h)) {
        return { csvHeader: header, target: 'name' };
      }
      if (['firstname', 'fname'].includes(h)) {
        return { csvHeader: header, target: 'firstName' };
      }
      if (['lastname', 'lname', 'surname'].includes(h)) {
        return { csvHeader: header, target: 'lastName' };
      }
      if (['email', 'mail', 'emailaddress'].includes(h)) {
        return { csvHeader: header, target: 'email' };
      }
      if (['tag', 'tags', 'segment', 'group', 'category', 'status'].includes(h)) {
        return { csvHeader: header, target: 'tag' };
      }

      // Default other fields to custom attributes for dynamic variables
      return {
        csvHeader: header,
        target: 'custom',
        customKeyName: header.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const allRows = parseCsvText(text);

        if (allRows.length < 2) {
          setErrorMsg('CSV file must have at least one header row and one data row.');
          return;
        }

        const detectedHeaders = allRows[0];
        const dataRows = allRows.slice(1);

        setHeaders(detectedHeaders);
        setParsedRows(dataRows);
        setMappings(autoMapHeaders(detectedHeaders));
        setStep(2);
      } catch (err: any) {
        setErrorMsg('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'name,phone_number,email,tag,order_id,city\n' +
      'Rahul Sharma,919876543210,rahul@example.com,VIP Customer,ORD-1002,Mumbai\n' +
      'Ananya Verma,918765432109,ananya@example.com,Diwali Lead,ORD-1003,Delhi\n' +
      'Karan Patel,917654321098,karan@example.com,Follow-up,ORD-1004,Bangalore\n' +
      'Sneha Iyer,919543210987,sneha@example.com,Hot Lead,ORD-1005,Chennai\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_whatsapp_contacts.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Convert parsed rows into payload matching user's mappings
  const buildPayload = () => {
    const phoneMappingIdx = mappings.findIndex((m) => m.target === 'phone');
    if (phoneMappingIdx === -1) {
      throw new Error('Please map at least one column to "Phone Number".');
    }

    return parsedRows.map((row) => {
      let rawPhone = row[phoneMappingIdx] || '';
      rawPhone = rawPhone.replace(/[\s-+()]/g, '');

      // Add default country code if missing (assuming 10-digit number is local)
      if (rawPhone.length === 10 && defaultCountryCode) {
        rawPhone = defaultCountryCode + rawPhone;
      }

      const item: any = {
        phoneNumber: rawPhone,
        customAttributes: {},
      };

      mappings.forEach((m, idx) => {
        const val = row[idx] ? row[idx].trim() : '';
        if (!val) return;

        if (m.target === 'name') item.name = val;
        else if (m.target === 'firstName') item.firstName = val;
        else if (m.target === 'lastName') item.lastName = val;
        else if (m.target === 'email') item.email = val;
        else if (m.target === 'tag') item.tag = val;
        else if (m.target === 'custom') {
          const key = m.customKeyName || m.csvHeader.toLowerCase().replace(/\s+/g, '_');
          item.customAttributes[key] = val;
        }
      });

      return item;
    });
  };

  const handleStartImport = async () => {
    try {
      setIsUploading(true);
      setErrorMsg(null);
      const contactsToImport = buildPayload();

      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: contactsToImport,
          defaultTag,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        throw new Error(json.error || 'Import request failed');
      }

      setImportResult(json.data);
      setStep(4);
      onSuccess({
        total: json.data.totalProcessed,
        inserted: json.data.insertedCount,
        updated: json.data.updatedCount,
        failed: json.data.failedCount,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete contact import');
    } finally {
      setIsUploading(false);
    }
  };

  const mappedPreviewRows = parsedRows.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#12141c] text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden my-8 flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Import Contacts from CSV</h2>
              <p className="text-xs text-white/50">
                Step {step} of 4: {step === 1 ? 'Upload File' : step === 2 ? 'Map Variables' : step === 3 ? 'Review & Validate' : 'Import Complete'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ─── STEP 1: Upload File & Options ─── */}
        {step === 1 && (
          <div className="p-8 space-y-6">
            {/* Drag & Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-emerald-500/60 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.04] group"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Drop your CSV spreadsheet here, or <span className="text-emerald-400 underline">browse files</span>
              </h3>
              <p className="text-xs text-white/40 max-w-sm">
                Supports .csv files with phone numbers and any custom columns for WhatsApp broadcasts.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Quick Helper Tools */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-emerald-400" />
                <div className="text-xs">
                  <span className="font-bold text-white block">Need a template to get started?</span>
                  <span className="text-white/40">Includes Name, Phone, Email, Tag, and Order ID variables.</span>
                </div>
              </div>

              <button
                onClick={downloadSampleCsv}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white transition-all cursor-pointer"
              >
                Download Sample CSV
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Variable & Column Mapping ─── */}
        {step === 2 && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Map CSV Columns to Contact Attributes</h3>
                <p className="text-xs text-white/50 mt-0.5">
                  We detected <strong>{headers.length}</strong> columns and <strong>{parsedRows.length}</strong> contact rows in &ldquo;{fileName}&rdquo;.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-white/40">Default Country Code:</span>
                <input
                  type="text"
                  value={defaultCountryCode}
                  onChange={(e) => setDefaultCountryCode(e.target.value.replace(/\D+/g, ''))}
                  placeholder="91"
                  className="w-16 px-2 py-1 bg-white/[0.05] border border-white/10 rounded-lg text-white font-bold text-center"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {mappings.map((mapping, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#171924] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-xs font-bold text-emerald-400">
                      #{idx + 1}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{mapping.csvHeader}</span>
                      <span className="text-[10px] text-white/40">
                        Sample: &ldquo;{parsedRows[0]?.[idx] || '—'}&rdquo;
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/40">Maps to:</span>
                    <select
                      value={mapping.target}
                      onChange={(e) => {
                        const target = e.target.value as FieldTarget;
                        setMappings((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, target } : m))
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.07] border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="phone" className="bg-[#171924]">Phone Number (Required)</option>
                      <option value="name" className="bg-[#171924]">Full Name</option>
                      <option value="firstName" className="bg-[#171924]">First Name</option>
                      <option value="lastName" className="bg-[#171924]">Last Name</option>
                      <option value="email" className="bg-[#171924]">Email Address</option>
                      <option value="tag" className="bg-[#171924]">Tag / Segment</option>
                      <option value="custom" className="bg-[#171924]">Custom Attribute (Variable)</option>
                      <option value="ignore" className="bg-[#171924]">Ignore Column</option>
                    </select>

                    {mapping.target === 'custom' && (
                      <input
                        type="text"
                        placeholder="variable_key"
                        value={mapping.customKeyName || ''}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                          setMappings((prev) =>
                            prev.map((m, i) => (i === idx ? { ...m, customKeyName: val } : m))
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400 w-32"
                        title="Variable name for WhatsApp campaigns"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP 3: Review & Validation Table ─── */}
        {step === 3 && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white">Preview Mapped Records</h3>
              <p className="text-xs text-white/50 mt-0.5">
                Here is a preview of the first few records formatted for WhatsApp broadcast campaigns.
              </p>
            </div>

            <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.04] border-b border-white/[0.06] text-white/50 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Phone (Normalized)</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Tag</th>
                      <th className="p-3">Custom Variables (JSONB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {mappedPreviewRows.map((row, rIdx) => {
                      const phoneIdx = mappings.findIndex((m) => m.target === 'phone');
                      const nameIdx = mappings.findIndex((m) => m.target === 'name');
                      const tagIdx = mappings.findIndex((m) => m.target === 'tag');

                      let cleanPhone = (row[phoneIdx] || '').replace(/[\s-+()]/g, '');
                      if (cleanPhone.length === 10 && defaultCountryCode) {
                        cleanPhone = defaultCountryCode + cleanPhone;
                      }

                      const customObj: Record<string, string> = {};
                      mappings.forEach((m, cIdx) => {
                        if (m.target === 'custom' && row[cIdx]) {
                          customObj[m.customKeyName || m.csvHeader] = row[cIdx];
                        }
                      });

                      return (
                        <tr key={rIdx} className="hover:bg-white/[0.02]">
                          <td className="p-3 text-white/40">{rIdx + 1}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">+{cleanPhone}</td>
                          <td className="p-3 font-medium text-white">{row[nameIdx] || '—'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.08] text-white/80">
                              {row[tagIdx] || defaultTag}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-amber-300">
                            {Object.keys(customObj).length > 0 ? JSON.stringify(customObj) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>
                Ready to process <strong>{parsedRows.length}</strong> contacts into your workspace database. Existing contacts with matching phone numbers will be automatically updated with new tags and attributes.
              </span>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Import Complete Summary ─── */}
        {step === 4 && importResult && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Contacts Successfully Imported!</h3>
              <p className="text-xs text-white/50 mt-1">
                Your customer list has been updated and is ready for broadcast campaigns and AI engagement.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4 max-w-lg mx-auto">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-[10px] font-bold text-white/40 uppercase block">Processed</span>
                <span className="text-lg font-black text-white">{importResult.totalProcessed}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-400 uppercase block">Inserted</span>
                <span className="text-lg font-black text-emerald-300">{importResult.insertedCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-[10px] font-bold text-blue-400 uppercase block">Updated</span>
                <span className="text-lg font-black text-blue-300">{importResult.updatedCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-[10px] font-bold text-red-400 uppercase block">Failed</span>
                <span className="text-lg font-black text-red-300">{importResult.failedCount}</span>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="text-left p-4 rounded-xl bg-red-500/10 border border-red-500/20 max-w-lg mx-auto text-xs text-red-300 space-y-1">
                <span className="font-bold block mb-1">Warnings / Errors:</span>
                {importResult.errors.map((e, idx) => (
                  <div key={idx} className="text-[11px]">
                    Row {e.row}: {e.phone ? `(${e.phone}) ` : ''}{e.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="p-6 border-t border-white/[0.08] flex items-center justify-between bg-[#0e1017]">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => {
                  const hasPhone = mappings.some((m) => m.target === 'phone');
                  if (!hasPhone) {
                    setErrorMsg('Please map at least one column to "Phone Number (Required)".');
                    return;
                  }
                  setErrorMsg(null);
                  setStep(3);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <span>Continue to Preview</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleStartImport}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing Contacts...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Import Contacts</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {step === 4 && (
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
