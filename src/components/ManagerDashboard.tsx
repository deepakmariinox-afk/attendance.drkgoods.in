import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  Clock,
  Check,
  X,
  FileSpreadsheet,
  AlertTriangle,
  Download,
  Search,
  FileText,
  Bell,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatIsoToLocalDate, formatIsoToLocalTime } from '../utils/dateUtils';
import { exportMonthlyPayrollPdf } from '../utils/pdfExport';
import { exportMonthlyPayrollExcel, exportAllRecordsToExcel } from '../utils/excelExport';
import { RosterUploadModal } from './RosterUploadModal';

export const ManagerDashboard: React.FC = () => {
  const {
    currentUser,
    employees,
    attendance,
    todayStr,
    leaves,
    updateLeaveStatus,
    resolveGpsFlag,
    payrollRecords,
    locations,
    selectedPayrollMonth,
    showNotification,
  } = useApp();

  const [resolveNoteModal, setResolveNoteModal] = useState<{ id: string; empName: string } | null>(null);
  const [noteText, setNoteText] = useState<string>('Approved field work / client site exception');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isLeaveApprovalModalOpen, setIsLeaveApprovalModalOpen] = useState<boolean>(false);
  const [isRosterUploadModalOpen, setIsRosterUploadModalOpen] = useState<boolean>(false);

  // Filter employees for manager's scope
  const teamEmployees = employees.filter((e) => {
    if (currentUser.role === 'admin') return true;
    return e.department === currentUser.department;
  });

  const todayRecords = attendance.filter((a) => a.date === todayStr);

  // Group team into statuses
  const statusStats = {
    checkedIn: 0,
    late: 0,
    onBreak: 0,
    notIn: 0,
    flagged: 0,
  };

  teamEmployees.forEach((emp) => {
    const rec = todayRecords.find((r) => r.employeeId === emp.id);
    if (!rec || rec.punches.length === 0) {
      statusStats.notIn++;
    } else {
      const lastPunch = rec.punches[rec.punches.length - 1];
      if (lastPunch.type === 'check_in' || lastPunch.type === 'break_end') {
        statusStats.checkedIn++;
      } else if (lastPunch.type === 'break_start') {
        statusStats.onBreak++;
      }
      if (rec.status === 'late') statusStats.late++;
      if (rec.isFlaggedForGps && !rec.flagResolved) statusStats.flagged++;
    }
  });

  // Flagged out-of-bounds records needing manager review
  const flaggedAttendance = attendance.filter((a) => {
    const emp = employees.find((e) => e.id === a.employeeId);
    if (!emp) return false;
    if (currentUser.role !== 'admin' && emp.department !== currentUser.department) return false;
    return a.isFlaggedForGps && !a.flagResolved;
  });

  // Pending leaves for team / organization
  const pendingLeaves = leaves.filter((l) => {
    const emp = employees.find((e) => e.id === l.employeeId);
    if (!emp) return false;
    if (currentUser.role !== 'admin' && emp.department !== currentUser.department) return false;
    return l.status === 'pending';
  });

  // Automatically open leave approval popup if there are pending leaves when opening the tab
  useEffect(() => {
    if (pendingLeaves.length > 0) {
      setIsLeaveApprovalModalOpen(true);
    }
  }, [pendingLeaves.length]);

  const handleResolveFlag = () => {
    if (!resolveNoteModal) return;
    resolveGpsFlag(resolveNoteModal.id, noteText);
    setResolveNoteModal(null);
  };

  const handleExportTeamPayroll = () => {
    const deptRecords = payrollRecords.filter((r) =>
      currentUser.role === 'admin' ? true : r.department === currentUser.department
    );
    exportMonthlyPayrollPdf(
      deptRecords,
      `August 2026 - ${currentUser.role === 'admin' ? 'All Departments' : currentUser.department}`,
      currentUser.name
    );
    showNotification('success', 'Exported Department Payroll PDF.');
  };

  const handleExportTeamExcel = async () => {
    try {
      setIsExporting(true);
      const deptRecords = payrollRecords.filter((r) =>
        currentUser.role === 'admin' ? true : r.department === currentUser.department
      );
      await exportMonthlyPayrollExcel(
        deptRecords,
        `August_2026_${currentUser.role === 'admin' ? 'All' : currentUser.department}`,
        currentUser.name
      );
      showNotification('success', 'Exported Team Payroll Excel (.xlsx).');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to export team Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMasterExcel = async () => {
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
      showNotification('success', 'Master Database (All Records) downloaded in Excel (.xlsx).');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to export master Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 uppercase tracking-wider">
              {currentUser.role === 'admin' ? 'Admin Master Oversight' : 'Authorized Manager Portal'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            {currentUser.role === 'admin' ? 'Organization Approval & Manager Console' : `${currentUser.department} Management`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Overseeing staff attendance, geofence compliance, leave approvals & payroll authorizations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Upload Roster Button */}
          <button
            onClick={() => setIsRosterUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition shrink-0 cursor-pointer"
            id="btn-manager-upload-roster"
            title="Upload Weekly or Monthly Workforce Roster (.xlsx / .csv)"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Roster (Weekly / Monthly)</span>
          </button>

          {/* Leave Approval Trigger Button */}
          <button
            onClick={() => setIsLeaveApprovalModalOpen(true)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition shrink-0 cursor-pointer ${
              pendingLeaves.length > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 animate-pulse'
                : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
            id="btn-open-leave-approvals"
          >
            <Calendar className="w-4 h-4" />
            <span>Leave Approvals ({pendingLeaves.length} Pending)</span>
          </button>

          <button
            onClick={handleExportTeamExcel}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition shrink-0 cursor-pointer disabled:opacity-50"
            id="btn-export-dept-excel"
            title="Download Team Payroll and Records in Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel</span>
          </button>

          <button
            onClick={handleExportTeamPayroll}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 inline-flex items-center gap-2 transition shrink-0 cursor-pointer"
            id="btn-export-dept-payroll"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportMasterExcel}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-2 transition shrink-0 cursor-pointer"
            id="btn-export-master-excel-manager"
            title="Download Full Master Database with all records"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Master DB (Excel)</span>
          </button>
        </div>
      </div>

      {/* Prominent Banner when Leave Applications are Pending */}
      {pendingLeaves.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>New Leave Application Submitted</span>
                <span className="px-2 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[10px] font-bold">
                  {pendingLeaves.length} Action Needed
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Staff member(s) have requested time-off. Please review and approve or decline.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsLeaveApprovalModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Open Leave Approval Popup</span>
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Team Members</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{teamEmployees.length}</div>
          <span className="text-[11px] text-slate-400">Assigned to your unit</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Present On-Site</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{statusStats.checkedIn}</div>
          <span className="text-[11px] text-emerald-600 font-medium">GPS Verified In Office</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Late Arrivals</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{statusStats.late}</div>
          <span className="text-[11px] text-amber-600">Past shift grace punch</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Pending Approvals</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">{pendingLeaves.length}</div>
          <span className="text-[11px] text-purple-600 font-medium">Leave & Exceptions</span>
        </div>
      </div>

      {/* GPS Out-of-Bounds Exceptions Tray */}
      {flaggedAttendance.length > 0 && (
        <div className="bg-red-50/70 rounded-2xl border border-red-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-800">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-sm">Action Required: GPS Geofence Exceptions</h3>
            </div>
            <span className="text-xs bg-red-200/80 text-red-900 px-2 py-0.5 rounded-full font-semibold">
              {flaggedAttendance.length} Pending
            </span>
          </div>

          <div className="space-y-3">
            {flaggedAttendance.map((rec) => {
              const emp = employees.find((e) => e.id === rec.employeeId);
              const punch = rec.punches[0];
              return (
                <div
                  key={rec.id}
                  className="bg-white p-4 rounded-xl border border-red-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{emp?.name}</span>
                      <span className="text-xs text-slate-500">({emp?.designation})</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                        {punch?.distanceFromOfficeMeters}m Away from Geofence
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Date: <strong className="text-slate-800">{formatIsoToLocalDate(rec.date)}</strong> at <strong className="text-blue-700">{formatIsoToLocalTime(punch?.timestamp)}</strong> • Location: {punch?.locationName}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      GPS Coords: {punch?.coordinates.latitude}, {punch?.coordinates.longitude} • Device: {punch?.deviceInfo || 'Mobile'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        setResolveNoteModal({
                          id: rec.id,
                          empName: emp?.name || 'Staff',
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Review & Authorize</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leave Requests Overview List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Team Leave Requests & History</h3>
              <p className="text-xs text-slate-500">Submissions, duration and approval statuses</p>
            </div>
          </div>
          <button
            onClick={() => setIsLeaveApprovalModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition cursor-pointer"
          >
            Open Approval Modal
          </button>
        </div>

        <div className="space-y-3">
          {leaves.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No leave records found.
            </div>
          ) : (
            leaves.map((leave) => {
              const emp = employees.find((e) => e.id === leave.employeeId);
              return (
                <div
                  key={leave.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{emp?.name || 'Staff Member'}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px] uppercase">
                        {leave.type} Leave
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          leave.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : leave.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Duration: <strong className="text-slate-800">{leave.startDate}</strong> to <strong className="text-slate-800">{leave.endDate}</strong>
                    </p>
                    <p className="text-xs text-slate-500 italic">"{leave.reason}"</p>
                  </div>

                  {leave.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateLeaveStatus(leave.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 text-red-500" />
                        <span>Decline</span>
                      </button>
                      <button
                        onClick={() => updateLeaveStatus(leave.id, 'approved')}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium inline-flex items-center gap-1 transition shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Leave Approval Popup Modal */}
      {isLeaveApprovalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Leave Application Approval Queue</h3>
                  <p className="text-xs text-slate-500">
                    Review and authorize employee leave requests
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLeaveApprovalModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pendingLeaves.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div className="font-bold text-slate-900 text-sm">All Leave Applications Reviewed</div>
                <p className="text-xs text-slate-500">There are no pending leave requests awaiting approval.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Applications ({pendingLeaves.length})
                </div>

                <div className="space-y-3">
                  {pendingLeaves.map((leave) => {
                    const emp = employees.find((e) => e.id === leave.employeeId);
                    return (
                      <div
                        key={leave.id}
                        className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{emp?.name || 'Staff Member'}</div>
                            <div className="text-[11px] text-slate-500">
                              {emp?.designation} • {emp?.department}
                            </div>
                            {emp?.phone && (
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                Phone: {emp.phone}
                              </div>
                            )}
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase border border-amber-200">
                            {leave.type} Leave
                          </span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex justify-between text-slate-600">
                            <span>Requested Period:</span>
                            <strong className="text-slate-900">
                              {leave.startDate} to {leave.endDate}
                            </strong>
                          </div>
                          <div className="text-slate-600 pt-1 border-t border-slate-100">
                            <span className="font-medium text-slate-700">Reason: </span>
                            <span className="italic text-slate-600">"{leave.reason}"</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              updateLeaveStatus(leave.id, 'rejected');
                            }}
                            className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>Decline Application</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateLeaveStatus(leave.id, 'approved');
                            }}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition inline-flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve Leave</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsLeaveApprovalModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                Close Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exception Resolution Modal */}
      {resolveNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Authorize GPS Out-of-Bounds Punch: {resolveNoteModal.empName}
            </h3>
            <p className="text-xs text-slate-500">
              Provide an administrative authorization note. This resolves the exception flag and authorizes payroll hours.
            </p>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full h-24 p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Field meeting approved with client..."
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setResolveNoteModal(null)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveFlag}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Authorize Exception
              </button>
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
