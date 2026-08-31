import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  MapPin,
  Smartphone,
  Calendar,
  AlertCircle,
  FileCheck,
  Building2,
  Users,
  CheckCircle,
  FileSpreadsheet,
  Trash2,
  RotateCcw,
  AlertTriangle,
  LogOut,
  Radio,
  ToggleLeft,
  ToggleRight,
  Navigation as NavigationIcon,
  Mail,
  Send,
  Sparkles,
  Settings,
  UploadCloud,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatIsoToLocalDate, formatIsoToLocalTime } from '../utils/dateUtils';
import { exportMonthlyPayrollPdf } from '../utils/pdfExport';
import {
  exportAllRecordsToExcel,
  exportAttendanceExcel,
  exportMonthlyPayrollExcel,
  exportStaffDirectoryExcel,
} from '../utils/excelExport';
import { RosterUploadModal } from './RosterUploadModal';

export const AdminOverview: React.FC = () => {
  const {
    employees,
    attendance,
    todayStr,
    adminPunchOutStaff,
    locations,
    payrollRecords,
    leaves,
    currentUser,
    selectedPayrollMonth,
    showNotification,
    clearAllAttendance,
    resetAllData,
    isGpsEnforced,
    toggleGpsEnforcement,
    emailConfig,
    updateEmailConfig,
    sendManualDailySummaryEmail,
    sendManualPunchAlertEmail,
    connectGmailOAuth,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSendingSummaryEmail, setIsSendingSummaryEmail] = useState<boolean>(false);
  const [isEmailConfigModalOpen, setIsEmailConfigModalOpen] = useState<boolean>(false);
  const [tempAdminEmail, setTempAdminEmail] = useState<string>(emailConfig.adminEmail || 'deepak.mariinox@gmail.com');
  const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = useState<boolean>(false);
  const [isConfirmResetModalOpen, setIsConfirmResetModalOpen] = useState<boolean>(false);
  const [isRosterUploadModalOpen, setIsRosterUploadModalOpen] = useState<boolean>(false);

  // Flatten punch audit logs
  const allPunchLogs = attendance.flatMap((rec) => {
    const emp = employees.find((e) => e.id === rec.employeeId);
    return rec.punches.map((p) => ({
      punchId: p.id,
      attendanceId: rec.id,
      date: rec.date,
      employeeId: rec.employeeId,
      employeeName: emp?.name || 'Unknown Staff',
      employeeRole: emp?.designation || '',
      department: emp?.department || '',
      phone: emp?.phone || '',
      type: p.type,
      timestamp: p.timestamp,
      locationName: p.locationName,
      coordinates: p.coordinates,
      distanceFromOfficeMeters: p.distanceFromOfficeMeters,
      isWithinGeofence: p.isWithinGeofence,
      otpVerified: p.otpVerified,
      otpMethod: p.otpMethod,
      deviceInfo: p.deviceInfo,
      status: rec.status,
      overrideNote: p.overrideNote || rec.notes,
    }));
  });

  // Filter logs
  const filteredLogs = allPunchLogs.filter((log) => {
    const matchSearch =
      log.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.locationName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchDept = selectedDept === 'all' || log.department === selectedDept;
    const matchStatus = selectedStatus === 'all' || log.status === selectedStatus;
    const matchLoc = selectedLocation === 'all' || log.locationName === selectedLocation;

    return matchSearch && matchDept && matchStatus && matchLoc;
  });

  const handleExportAllPayroll = () => {
    exportMonthlyPayrollPdf(payrollRecords, 'August 2026', currentUser.name);
    showNotification('success', 'Exported Master Monthly Payroll PDF.');
  };

  const handleExportAllRecordsExcel = async () => {
    try {
      setIsExporting(true);
      await exportAllRecordsToExcel({
        employees,
        attendance,
        payrollRecords,
        leaves,
        locations,
        selectedMonth: selectedPayrollMonth,
        exportedBy: currentUser.name,
      });
      showNotification('success', 'Master Enterprise Database (All Records) downloaded in Excel (.xlsx).');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Master Excel file.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAttendanceExcel = async () => {
    try {
      setIsExporting(true);
      await exportAttendanceExcel(attendance, employees, selectedPayrollMonth);
      showNotification('success', `Exported Attendance Records for ${selectedPayrollMonth} in Excel.`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to export attendance.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportStaffExcel = async () => {
    try {
      setIsExporting(true);
      await exportStaffDirectoryExcel(employees, locations);
      showNotification('success', 'Staff Directory downloaded in Excel (.xlsx).');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to export staff directory.');
    } finally {
      setIsExporting(false);
    }
  };

  const departments = Array.from(new Set(employees.map((e) => e.department)));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Global Oversight</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Enterprise Attendance & Audit Center</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Comprehensive real-time telemetry, GPS geofence verifications, and master compliance records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Upload Roster Button */}
          <button
            onClick={() => setIsRosterUploadModalOpen(true)}
            className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition inline-flex items-center gap-2 shrink-0 cursor-pointer"
            id="btn-admin-upload-roster"
            title="Upload Weekly or Monthly Workforce Roster Spreadsheet (.xlsx / .csv)"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Roster (Weekly / Monthly)</span>
          </button>

          {/* Master Excel Button */}
          <button
            onClick={handleExportAllRecordsExcel}
            disabled={isExporting}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition inline-flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            id="btn-admin-export-all-excel"
            title="Download All Records in a Single Multi-Sheet Excel Workbook"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? 'Generating Excel...' : 'Download All Records (Excel)'}</span>
          </button>

          {/* Master PDF Button */}
          <button
            onClick={handleExportAllPayroll}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition inline-flex items-center gap-2 shrink-0 cursor-pointer"
            id="btn-admin-export-payroll"
          >
            <Download className="w-4 h-4" />
            <span>Export Payroll PDF</span>
          </button>
        </div>
      </div>

      {/* GPS Enforcement Toggle & Global System Control */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isGpsEnforced
            ? 'bg-blue-50/70 border-blue-200'
            : 'bg-amber-50/80 border-amber-300'
        }`}
        id="card-gps-toggle-control"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              isGpsEnforced
                ? 'bg-blue-600 text-white'
                : 'bg-amber-500 text-white animate-pulse'
            }`}
          >
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                GPS Geofence Perimeter Requirement
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  isGpsEnforced
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-200 text-amber-900 border border-amber-400 font-extrabold'
                }`}
              >
                {isGpsEnforced ? '● GPS ENABLED (Strict Office Perimeter)' : '○ GPS DISABLED (Remote Punch Allowed)'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
              {isGpsEnforced
                ? 'Strict Mode: Staff and candidates MUST be physically present inside the authorized worksite coordinates to punch.'
                : 'Free / Remote Mode: Staff and candidates can punch in and out from ANY location without GPS radius restrictions.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => {
              toggleGpsEnforcement(!isGpsEnforced);
              showNotification(
                !isGpsEnforced ? 'success' : 'info',
                !isGpsEnforced
                  ? 'GPS Geofence has been ENABLED. Staff must be inside office perimeter to punch.'
                  : 'GPS Geofence has been DISABLED. Staff can now punch in/out remotely from anywhere.'
              );
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer ${
              isGpsEnforced
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
            }`}
            id="btn-toggle-gps-enforcement"
          >
            {isGpsEnforced ? (
              <>
                <ToggleRight className="w-4 h-4" />
                <span>Disable GPS Requirement</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4" />
                <span>Enable GPS Requirement</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Automatic Email Notification to Admin Center */}
      <div
        className="rounded-2xl border p-4 sm:p-5 shadow-xs transition bg-linear-to-r from-slate-900 to-indigo-950 text-white border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
        id="card-email-notification-control"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0 shadow-xs">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Automatic Staff Punch Email Alerts</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  emailConfig.enableAutoPunchEmails
                    ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-slate-700 text-slate-300 border border-slate-600'
                }`}
              >
                {emailConfig.enableAutoPunchEmails ? '● ACTIVE (Auto-Delivery)' : '○ PAUSED'}
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-0.5 max-w-2xl">
              Dispatching real-time punch-in, punch-out, GPS location, and telemetry reports directly to Admin ({emailConfig.adminEmail || 'deepak.mariinox@gmail.com'}).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-center shrink-0">
          {/* Send Daily Attendance Report Now */}
          <button
            type="button"
            disabled={isSendingSummaryEmail}
            onClick={async () => {
              setIsSendingSummaryEmail(true);
              try {
                await sendManualDailySummaryEmail(todayStr);
              } finally {
                setIsSendingSummaryEmail(false);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            id="btn-send-daily-summary-email"
            title="Send Today's Comprehensive Attendance Summary to Admin Email"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSendingSummaryEmail ? 'Sending Summary...' : 'Send Daily Summary to Email'}</span>
          </button>

          {/* Quick Toggle Auto Punch Alerts */}
          <button
            type="button"
            onClick={() => {
              const nextState = !emailConfig.enableAutoPunchEmails;
              updateEmailConfig({ enableAutoPunchEmails: nextState });
              showNotification(
                nextState ? 'success' : 'info',
                nextState
                  ? `Automatic punch email alerts ENABLED for Admin (${emailConfig.adminEmail})`
                  : 'Automatic punch email alerts PAUSED.'
              );
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              emailConfig.enableAutoPunchEmails
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            id="btn-toggle-auto-punch-emails"
          >
            {emailConfig.enableAutoPunchEmails ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-400" />
                <span>Auto-Alerts ON</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-400" />
                <span>Auto-Alerts OFF</span>
              </>
            )}
          </button>

          {/* Email Settings Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsEmailConfigModalOpen(true)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Configure Admin Email & Google Workspace Settings"
            id="btn-open-email-config"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            Enrolled Personnel
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{employees.length}</div>
          <span className="text-[11px] text-slate-400">Across 3 branches</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Active Geofences
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{locations.length}</div>
          <span className="text-[11px] text-emerald-600 font-medium">GPS perimeters operational</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-purple-600" />
            Total Monthly Punches
          </span>
          <div className="text-2xl font-bold text-purple-600 mt-1">{allPunchLogs.length}</div>
          <span className="text-[11px] text-slate-400">OTP & GPS verified</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            GPS Compliance Rate
          </span>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {allPunchLogs.length > 0
              ? `${Math.round(
                  (allPunchLogs.filter((p) => p.isWithinGeofence).length / allPunchLogs.length) * 100
                )}%`
              : '100%'}
          </div>
          <span className="text-[11px] text-slate-400">Within defined radius</span>
        </div>
      </div>

      {/* Quick Excel Exports & Data Maintenance Bar */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
              Excel Data Export & Maintenance Hub
            </h4>
            <p className="text-[11px] text-emerald-800">
              Download formatted spreadsheets with complete GPS telemetry, or manage attendance ledger records.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportAllRecordsExcel}
            disabled={isExporting}
            className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            title="Download Master Multi-Tab Excel Workbook"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Master Workbook</span>
          </button>

          <button
            onClick={handleExportAttendanceExcel}
            disabled={isExporting}
            className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
            title="Download Attendance Records in Excel"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Attendance Log (.xlsx)</span>
          </button>

          {/* Clear Attendance Button */}
          <button
            onClick={() => setIsConfirmClearModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-red-700 border border-red-300 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
            title="Clear all recorded attendance logs"
            id="btn-admin-clear-attendance"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Clear Attendance Records</span>
          </button>

          {/* Reset System / Candidate Details Button */}
          <button
            onClick={() => setIsConfirmResetModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
            title="Reset system data and purge dummy candidate records"
            id="btn-admin-reset-data"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset All Data</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by staff name, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Work Locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Attendance Statuses</option>
              <option value="present">Present (On-time)</option>
              <option value="late">Late Arrival</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Full Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Real-Time Audit Records ({filteredLogs.length})</h3>
            <p className="text-xs text-slate-500">Every GPS coordinate, OTP verification, and device imprint</p>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">No Attendance Records Found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                All previous old attendance records have been cleared. When staff check in with GPS + OTP verification, real-time telemetry will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Date / Time</th>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Location & Radius</th>
                  <th className="py-3 px-3">GPS Coordinates</th>
                  <th className="py-3 px-3">OTP & Identity</th>
                  <th className="py-3 px-3">Geofence Status</th>
                  <th className="py-3 px-3 text-center">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.slice(0, 50).map((log) => (
                  <tr key={log.punchId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{formatIsoToLocalDate(log.date)}</div>
                      <div className="text-[11px] text-blue-600 font-mono font-medium">
                        {formatIsoToLocalTime(log.timestamp, { includeSeconds: true })}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{log.employeeName}</div>
                      <div className="text-[11px] text-slate-500">{log.department}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.type === 'check_in'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.type === 'check_out'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.type.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-700">
                      <div className="font-medium">{log.locationName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {log.distanceFromOfficeMeters}m from center
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                      <div>Lat: {log.coordinates.latitude}</div>
                      <div>Lon: {log.coordinates.longitude}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-emerald-700 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>OTP Verified</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Phone: ...{log.phone.slice(-4)}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {log.overrideNote?.includes('10 Hours') || log.overrideNote?.includes('Auto Punch Out') ? (
                        <div className="space-y-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-bold inline-block">
                            Auto 10-Hour Shift Completed
                          </span>
                          <div className="text-[10px] text-blue-600 italic">
                            System auto-checkout at 10h limit
                          </div>
                        </div>
                      ) : log.isWithinGeofence ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          Within Geofence
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                            Out-of-Bounds ({log.distanceFromOfficeMeters}m)
                          </span>
                          {log.overrideNote && (
                            <div className="text-[10px] text-slate-500 italic max-w-xs">
                              Note: {log.overrideNote}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Send individual punch alert to Admin Email */}
                        <button
                          type="button"
                          onClick={() => {
                            const emp = employees.find((e) => e.id === log.employeeId) || {
                              id: log.employeeId,
                              name: log.employeeName,
                              phone: log.phone,
                              department: log.department,
                              role: 'staff',
                              hourlyRate: 100,
                              monthlySalary: 25000,
                              status: 'active',
                            };
                            sendManualPunchAlertEmail(log.rawPunch, emp as any);
                          }}
                          className="px-2 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                          title={`Send punch email notification for ${log.employeeName} to Admin`}
                        >
                          <Mail className="w-3 h-3" />
                          <span>Email Alert</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => adminPunchOutStaff(log.employeeId)}
                          className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                          title={`Admin Remote Punch Out for ${log.employeeName} (Anywhere Allowed)`}
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Remote Out</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal: Clear Attendance */}
      {isConfirmClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
            <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Clear All Attendance Records</span>
              </div>
              <button
                onClick={() => setIsConfirmClearModalOpen(false)}
                className="text-red-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 text-sm">
                Are you sure you want to <strong>delete all previous attendance logs</strong>?
              </p>
              <p className="text-slate-500 text-xs">
                This will reset all past punches, work hours, overtime, and telemetry records to a clean slate. This action cannot be undone.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmClearModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAllAttendance();
                    setIsConfirmClearModalOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  id="btn-confirm-clear-attendance"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Clear All Logs</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Notification & Google Workspace Configuration Modal */}
      {isEmailConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-semibold text-sm">
                <Mail className="w-5 h-5 text-indigo-400" />
                <span>Email Punch Alerts & Google Workspace Settings</span>
              </div>
              <button
                onClick={() => setIsEmailConfigModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Admin Recipient Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={tempAdminEmail}
                    onChange={(e) => setTempAdminEmail(e.target.value)}
                    placeholder="deepak.mariinox@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    id="input-admin-email-recipient"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  All automatic punch-in, punch-out, remote overrides, and daily summary reports will be delivered here.
                </p>
              </div>

              {/* Switches */}
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">Automatic Punch Alerts</div>
                    <div className="text-[11px] text-slate-500">
                      Send instant email when any staff punches in or out
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailConfig.enableAutoPunchEmails}
                    onChange={(e) => updateEmailConfig({ enableAutoPunchEmails: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                    id="checkbox-enable-auto-punch-emails"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">Daily Attendance Summary Report</div>
                    <div className="text-[11px] text-slate-500">
                      Include comprehensive daily attendance breakdown
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailConfig.enableDailySummaryEmail}
                    onChange={(e) => updateEmailConfig({ enableDailySummaryEmail: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                    id="checkbox-enable-daily-summary-emails"
                  />
                </div>
              </div>

              {/* Google Workspace Gmail Auth Status */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-xs text-indigo-950">Google Workspace (Gmail API)</span>
                  </div>
                  <button
                    type="button"
                    onClick={connectGmailOAuth}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition shadow-xs cursor-pointer"
                    id="btn-reconnect-gmail-oauth"
                  >
                    Authenticate with Google
                  </button>
                </div>
                <p className="text-[11px] text-indigo-900/80">
                  Emails are sent via authorized Google Workspace OAuth or instant server relay fallback to ensure 100% reliable inbox delivery.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailConfigModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleanEmail = tempAdminEmail.trim();
                    if (cleanEmail) {
                      updateEmailConfig({ adminEmail: cleanEmail });
                      showNotification('success', `Admin email updated to ${cleanEmail}`);
                    }
                    setIsEmailConfigModalOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md transition cursor-pointer"
                  id="btn-save-email-settings"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reset All Data & Candidate Details */}
      {isConfirmResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <RotateCcw className="w-5 h-5 text-blue-400" />
                <span>Reset All Data & Candidate Details</span>
              </div>
              <button
                onClick={() => setIsConfirmResetModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 text-sm">
                This will purge all old attendance records, leave requests, and candidate details, resetting the system to clean defaults with the administrator account.
              </p>
              <p className="text-slate-500 text-xs">
                You can subsequently enroll genuine staff members and candidates in the Staff Directory.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmResetModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetAllData();
                    setIsConfirmResetModalOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-md transition cursor-pointer"
                  id="btn-confirm-reset-all-data"
                >
                  <RotateCcw className="w-4 h-4 text-blue-400" />
                  <span>Reset to Clean State</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roster Upload Modal (Weekly & Monthly) */}
      <RosterUploadModal
        isOpen={isRosterUploadModalOpen}
        onClose={() => setIsRosterUploadModalOpen(false)}
      />
    </div>
  );
};
