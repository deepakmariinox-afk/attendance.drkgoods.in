import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Calendar,
  CalendarDays,
  Clock,
  Users,
  ArrowRight,
  RefreshCw,
  FileText,
  Sparkles,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  exportWeeklyRosterTemplate,
  exportMonthlyRosterTemplate,
  exportCsvRosterTemplate,
  parseRosterFile,
  RosterParseResult,
  ParsedRosterRow,
} from '../utils/rosterExcelUtils';

interface RosterUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RosterUploadModal: React.FC<RosterUploadModalProps> = ({ isOpen, onClose }) => {
  const {
    employees,
    shifts,
    companyWeekOffDays,
    bulkUpdateRoster,
    showNotification,
    selectedPayrollMonth,
  } = useApp();

  const [activeMode, setActiveMode] = useState<'weekly' | 'monthly'>('weekly');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<RosterParseResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'warning' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Template Download Handlers
  const handleDownloadWeeklyTemplate = async () => {
    try {
      setIsDownloading(true);
      await exportWeeklyRosterTemplate(employees, shifts, companyWeekOffDays);
      showNotification('success', 'Weekly Roster Excel Template (.xlsx) downloaded.');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate weekly roster template.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadMonthlyTemplate = async () => {
    try {
      setIsDownloading(true);
      await exportMonthlyRosterTemplate(employees, shifts, selectedPayrollMonth || 'August 2026', companyWeekOffDays);
      showNotification('success', 'Monthly Roster Excel Template (.xlsx) downloaded.');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate monthly roster template.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCsvTemplate = () => {
    try {
      exportCsvRosterTemplate(employees, shifts, activeMode, companyWeekOffDays);
      showNotification('success', `${activeMode === 'weekly' ? 'Weekly' : 'Monthly'} CSV Template downloaded.`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate CSV template.');
    }
  };

  // File Processing
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setUploadedFile(file);
    setIsParsing(true);
    try {
      const result = await parseRosterFile(file, employees, shifts, companyWeekOffDays);
      setParseResult(result);
      if (result.validCount > 0) {
        showNotification('success', `Parsed ${result.totalRows} roster rows (${result.validCount} valid).`);
      } else {
        showNotification('error', 'No valid employee matches found in the uploaded file.');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'Failed to parse the roster file.');
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleResetUpload = () => {
    setUploadedFile(null);
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Apply parsed roster to state
  const handleApplyRoster = () => {
    if (!parseResult) return;
    const applicableRows = parseResult.rows.filter(
      (r) => (r.status === 'valid' || r.status === 'warning') && r.matchedEmployee
    );

    if (applicableRows.length === 0) {
      showNotification('error', 'No valid rows available to apply.');
      return;
    }

    setIsApplying(true);
    try {
      const updates = applicableRows.map((row) => ({
        employeeId: row.matchedEmployee!.id,
        assignedShiftId: row.matchedShift?.id || row.matchedEmployee!.assignedShiftId,
        weekOffDays: row.parsedWeekOffDays.length > 0 ? row.parsedWeekOffDays : undefined,
      }));

      const success = bulkUpdateRoster(updates);
      if (success) {
        onClose();
        handleResetUpload();
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Error applying roster updates.');
    } finally {
      setIsApplying(false);
    }
  };

  // Filter preview rows
  const filteredRows = (parseResult?.rows || []).filter((row) => {
    if (filterStatus !== 'all' && row.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const empName = row.matchedEmployee?.name.toLowerCase() || row.rawEmpName?.toLowerCase() || '';
      const empId = row.matchedEmployee?.id.toLowerCase() || row.rawEmpId?.toLowerCase() || '';
      const phone = row.matchedEmployee?.phone || row.rawPhone || '';
      const shift = row.matchedShift?.name.toLowerCase() || row.rawShift?.toLowerCase() || '';
      return empName.includes(q) || empId.includes(q) || phone.includes(q) || shift.includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 border border-purple-400/30 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Upload Workforce Roster
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  Weekly & Monthly
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                Bulk assign Work Shifts and Day-wise Weekly Off schedules via Excel (.xlsx) or CSV
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveMode('weekly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'weekly'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Weekly Roster Mode</span>
            </button>
            <button
              onClick={() => setActiveMode('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Monthly Roster Mode</span>
            </button>
          </div>

          {/* Quick Download Template Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={activeMode === 'weekly' ? handleDownloadWeeklyTemplate : handleDownloadMonthlyTemplate}
              disabled={isDownloading}
              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Download pre-filled template with active staff list"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>
                Download {activeMode === 'weekly' ? 'Weekly' : 'Monthly'} Template (.xlsx)
              </span>
            </button>

            <button
              onClick={handleDownloadCsvTemplate}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 transition cursor-pointer"
              title="Download CSV version"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Instructions Box */}
          <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex items-start gap-3 text-xs text-slate-700">
            <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-purple-950">
                How to populate and upload your workforce roster:
              </p>
              <ol className="list-decimal pl-4 space-y-0.5 text-slate-600">
                <li>
                  Click <strong>Download {activeMode === 'weekly' ? 'Weekly' : 'Monthly'} Template</strong> above to get an Excel sheet pre-populated with your {employees.length} staff members.
                </li>
                <li>
                  Update the <strong>Assigned Shift</strong> (e.g. <em>Morning Shift 07:00-16:00</em>, <em>General Shift</em>) and <strong>Day-wise Week Off Days</strong> (e.g. <em>Sunday</em>, <em>Saturday, Sunday</em>, or <em>Monday</em>).
                </li>
                <li>
                  Upload your updated <code>.xlsx</code> or <code>.csv</code> below to preview matched records before applying.
                </li>
              </ol>
            </div>
          </div>

          {/* Upload Zone */}
          {!parseResult ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-purple-300 hover:border-purple-500 bg-purple-50/30 hover:bg-purple-50/60 transition rounded-3xl p-8 sm:p-10 text-center cursor-pointer flex flex-col items-center justify-center gap-3 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div className="p-4 rounded-2xl bg-white shadow-xs border border-purple-200 group-hover:scale-105 transition">
                <UploadCloud className="w-8 h-8 text-purple-600" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {isParsing ? 'Reading and verifying spreadsheet...' : 'Choose Roster Spreadsheet or Drag & Drop'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Supports Excel (.xlsx, .xls) and CSV (.csv) with auto employee & shift matching
                </p>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 text-[11px] font-semibold">
                  ⚡ Auto-matches by Emp ID, Mobile, or Name
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 text-[11px] font-semibold">
                  🏖️ Day-wise Week Off parser
                </span>
              </div>
            </div>
          ) : (
            /* Parsed Summary & Table View */
            <div className="space-y-4">
              {/* Top File Card & Counters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/20 border border-purple-400/30 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{parseResult.filename}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200">
                        {parseResult.totalRows} Total Rows
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {parseResult.validCount} valid, {parseResult.warningCount} auto-defaulted, {parseResult.errorCount} unmatched
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetUpload}
                    className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Upload Different File</span>
                  </button>
                </div>
              </div>

              {/* Stats Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-slate-500">Total Records</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{parseResult.totalRows}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('valid')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    filterStatus === 'valid'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                      : 'bg-white border-slate-200 hover:bg-emerald-50/50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ready to Apply</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-800 mt-0.5">{parseResult.validCount}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('warning')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    filterStatus === 'warning'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                      : 'bg-white border-slate-200 hover:bg-amber-50/50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Auto-Matched</span>
                  </div>
                  <div className="text-lg font-bold text-amber-800 mt-0.5">{parseResult.warningCount}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('error')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    filterStatus === 'error'
                      ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300'
                      : 'bg-white border-slate-200 hover:bg-rose-50/50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Unmatched</span>
                  </div>
                  <div className="text-lg font-bold text-rose-800 mt-0.5">{parseResult.errorCount}</div>
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Search parsed records by name, ID, phone, shift..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full max-w-sm px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-slate-50"
                />

                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredRows.length} of {parseResult.rows.length} rows
                </span>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Employee</th>
                        <th className="py-2.5 px-3">Assigned Shift</th>
                        <th className="py-2.5 px-3">Day-wise Week Off</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={`hover:bg-slate-50 transition ${
                            row.status === 'error'
                              ? 'bg-rose-50/40'
                              : row.status === 'warning'
                              ? 'bg-amber-50/30'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-400 font-semibold">
                            #{row.rowNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.matchedEmployee ? (
                              <div>
                                <div className="font-bold text-slate-900">
                                  {row.matchedEmployee.name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {row.matchedEmployee.id} • {row.matchedEmployee.department}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-rose-700">
                                  {row.rawEmpName || row.rawEmpId || 'Unrecognized Staff'}
                                </span>
                                <div className="text-[10px] text-rose-500 font-mono">
                                  {row.rawPhone || 'No valid contact'}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.matchedShift ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-[11px] font-semibold">
                                  <Clock className="w-3 h-3 text-purple-600" />
                                  <span>{row.matchedShift.name}</span>
                                </span>
                                <div className="text-[10px] text-slate-500 pl-1 mt-0.5">
                                  {row.matchedShift.startTime} - {row.matchedShift.endTime} ({row.matchedShift.workingHours || 9}h)
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No shift change</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">
                              <CalendarDays className="w-3 h-3 text-amber-600" />
                              <span>
                                {row.parsedWeekOffDays.length > 0
                                  ? row.parsedWeekOffDays.join(', ')
                                  : 'None (7 Days)'}
                              </span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {row.status === 'valid' && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Valid</span>
                              </span>
                            )}
                            {row.status === 'warning' && (
                              <div>
                                <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Auto-Mapped</span>
                                </span>
                                <div className="text-[10px] text-amber-600 mt-0.5">{row.message}</div>
                              </div>
                            )}
                            {row.status === 'error' && (
                              <div>
                                <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[11px]">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Error</span>
                                </span>
                                <div className="text-[10px] text-rose-600 mt-0.5">{row.message}</div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {parseResult ? (
              <span>
                Ready to update{' '}
                <strong className="text-slate-900 font-bold">
                  {parseResult.validCount + parseResult.warningCount}
                </strong>{' '}
                staff roster schedules
              </span>
            ) : (
              <span>Upload a roster Excel or CSV file to continue</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            {parseResult && (
              <button
                onClick={handleApplyRoster}
                disabled={isApplying || parseResult.validCount + parseResult.warningCount === 0}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Applying Roster...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Apply Roster Updates ({parseResult.validCount + parseResult.warningCount})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
