import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Play,
  ShieldCheck,
  MapPin,
  Calendar,
  AlertTriangle,
  FileText,
  Send,
  Download,
  Info,
  Users,
  Smartphone,
  CheckCircle2,
  CalendarDays,
  FileSpreadsheet,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { PunchType } from '../types';
import {
  getDeviceLocalDateStr,
  getDeviceLocalMonthStr,
  formatIsoToLocalTime,
  formatIsoToLocalDate,
  formatIsoToLocalDateTime,
} from '../utils/dateUtils';
import { OtpVerificationModal } from './OtpVerificationModal';
import { LiveGpsRadar } from './LiveGpsRadar';
import { DownloadCenterModal } from './DownloadCenterModal';
import { AppDownloadModal } from './AppDownloadModal';
import { exportEmployeePaySlipPdf, exportIndividualMonthlyAttendancePdf } from '../utils/pdfExport';
import { exportIndividualAttendanceExcel } from '../utils/excelExport';
import { BrandLogo } from './BrandLogo';

export const StaffPunchClock: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    employees,
    shifts,
    currentOffice,
    todayRecord,
    activePunchStatus,
    isWithinGeofence,
    isGpsEnforced,
    distanceToOffice,
    attendance,
    leaves,
    applyLeave,
    payrollRecords,
    setIsLoginModalOpen,
    showNotification,
    isTodayWeekOff,
    getEmployeeWeekOffDays,
    logout,
  } = useApp();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedPunchType, setSelectedPunchType] = useState<PunchType | null>(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [isDownloadCenterOpen, setIsDownloadCenterOpen] = useState<boolean>(false);
  const [isAppDownloadOpen, setIsAppDownloadOpen] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getDeviceLocalMonthStr());
  const [viewMode, setViewMode] = useState<'monthly' | 'recent'>('monthly');

  const availableMonths = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    const d = new Date();
    for (let i = 0; i < 6; i++) {
      const target = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const val = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
      const label = target.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      list.push({ value: val, label });
    }
    return list;
  }, []);

  // Leave Form State
  const [leaveType, setLeaveType] = useState<'sick' | 'casual' | 'annual' | 'unpaid'>('annual');
  const [leaveStart, setLeaveStart] = useState<string>(() => getDeviceLocalDateStr());
  const [leaveEnd, setLeaveEnd] = useState<string>(() => getDeviceLocalDateStr());
  const [leaveReason, setLeaveReason] = useState<string>('');

  // Live Timer for elapsed work time
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute elapsed work seconds today
  useEffect(() => {
    if (activePunchStatus === 'checked_in' && todayRecord?.checkInTime) {
      const startMs = new Date(todayRecord.checkInTime).getTime();
      const updateElapsed = () => {
        const nowMs = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
      };
      updateElapsed();
      const int = setInterval(updateElapsed, 1000);
      return () => clearInterval(int);
    } else if (todayRecord?.totalWorkMinutes) {
      setElapsedSeconds(todayRecord.totalWorkMinutes * 60);
    } else {
      setElapsedSeconds(0);
    }
  }, [activePunchStatus, todayRecord]);

  const assignedShift = useMemo(() => {
    return (
      shifts.find((s) => s.id === currentUser.assignedShiftId) ||
      shifts[0] || {
        id: 'default',
        name: 'General Shift',
        startTime: '09:00',
        endTime: '17:30',
        gracePeriodMinutes: 15,
        workingHours: 9,
      }
    );
  }, [shifts, currentUser.assignedShiftId]);

  const userWeekOffDays = useMemo(() => {
    return getEmployeeWeekOffDays(currentUser);
  }, [getEmployeeWeekOffDays, currentUser]);

  const todayIsOff = isTodayWeekOff(currentUser.id);

  const handleInitiatePunch = (type: PunchType) => {
    setSelectedPunchType(type);
    setIsOtpModalOpen(true);
  };

  const handlePunchSuccess = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !leaveReason.trim()) return;

    applyLeave({
      employeeId: currentUser.id,
      type: leaveType,
      startDate: leaveStart,
      endDate: leaveEnd,
      reason: leaveReason,
    });

    setIsLeaveModalOpen(false);
    setLeaveReason('');
  };

  const formatElapsedTime = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Recent attendance for this user
  const myRecentAttendance = useMemo(() => {
    if (!currentUser) return [];
    return attendance
      .filter((a) => a.employeeId === currentUser.id)
      .slice(0, 7);
  }, [attendance, currentUser]);

  // Monthly attendance for this user in selectedMonth
  const myMonthAttendance = useMemo(() => {
    if (!currentUser) return [];
    return attendance
      .filter((a) => a.employeeId === currentUser.id && a.date.startsWith(selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, currentUser, selectedMonth]);

  const displayedAttendance = viewMode === 'monthly' ? myMonthAttendance : myRecentAttendance;

  // Monthly summary stats
  const monthStats = useMemo(() => {
    let daysPresent = 0;
    let daysLate = 0;
    let daysAbsent = 0;
    let totalWorkMin = 0;
    let totalOtMin = 0;

    myMonthAttendance.forEach((rec) => {
      if (rec.status === 'present') daysPresent++;
      else if (rec.status === 'late') {
        daysPresent++;
        daysLate++;
      } else if (rec.status === 'absent') {
        daysAbsent++;
      }
      totalWorkMin += rec.totalWorkMinutes || 0;
      totalOtMin += rec.overtimeMinutes || 0;
    });

    return {
      daysPresent,
      daysLate,
      daysAbsent,
      totalHours: (totalWorkMin / 60).toFixed(1),
      totalOtHours: (totalOtMin / 60).toFixed(1),
      onTimeRate: daysPresent > 0 ? Math.round(((daysPresent - daysLate) / daysPresent) * 100) : 100,
    };
  }, [myMonthAttendance]);

  // My current month payroll
  const myPayroll = useMemo(() => {
    if (!currentUser) return undefined;
    return payrollRecords.find((p) => p.employeeId === currentUser.id);
  }, [payrollRecords, currentUser]);

  const handleExportMonthlyAttendancePdf = () => {
    if (!currentUser) return;
    const monthObj = availableMonths.find((m) => m.value === selectedMonth);
    const monthLabel = monthObj ? monthObj.label : selectedMonth;
    exportIndividualMonthlyAttendancePdf(
      currentUser,
      attendance,
      selectedMonth,
      monthLabel,
      currentOffice
    );
    showNotification('success', `Exported Monthly Attendance PDF for ${currentUser.name} (${monthLabel}).`);
  };

  const handleExportMonthlyAttendanceExcel = async () => {
    if (!currentUser) return;
    try {
      await exportIndividualAttendanceExcel(currentUser, attendance, selectedMonth, currentOffice);
      showNotification('success', `Downloaded Attendance Excel (.xlsx) for ${currentUser.name}.`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Excel attendance report.');
    }
  };

  // Filter staff: only staff who have a mobile number entered by admin
  const eligibleStaff = useMemo(() => {
    return employees.filter((e) => {
      const isEmpAdmin = e.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
      if (isEmpAdmin) return false;
      return !!(e.phone && e.phone.trim().length >= 4);
    });
  }, [employees]);

  const isAdmin = Boolean(
    currentUser &&
    currentUser.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com' &&
    currentUser.role === 'admin'
  );

  // If no user is logged in (Logged out / Guest Terminal mode)
  if (!currentUser) {
    return (
      <div className="space-y-6">
        {/* Guest / Kiosk Header Banner */}
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
          <div className="absolute right-32 -bottom-16 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Workforce Attendance Terminal (Kiosk Mode)</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                DRK Goods Punch Clock & Geofence System
              </h2>
              <p className="text-sm text-slate-400 max-w-xl">
                Please select your staff profile below or sign in with your registered 10-digit mobile number to record GPS punches and access records.
              </p>

              {/* Big Live Digital Clock */}
              <div className="flex items-baseline gap-3 pt-2">
                <div className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-blue-400">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-sm text-slate-400 font-medium">
                  {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-800/60 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 space-y-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-white text-sm">Staff & Admin Authentication</h3>
              <p className="text-xs text-slate-400">
                Instant OTP verification with registered mobile number
              </p>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                id="btn-kiosk-phone-login"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Enter Mobile Number (OTP)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Staff Selection Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Select Staff Member to Punch In</h3>
              <p className="text-xs text-slate-500">Tap your name to load your profile and verify your GPS punch with 4-digit mobile OTP</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {eligibleStaff.length} Staff Members Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {eligibleStaff.map((staff) => (
              <div
                key={staff.id}
                onClick={() => setCurrentUser(staff)}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition cursor-pointer flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center group-hover:bg-blue-600 transition">
                    {staff.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-xs group-hover:text-blue-900 transition">
                      {staff.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">{staff.designation}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">📞 {staff.phone}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentUser(staff);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 text-xs font-semibold transition"
                >
                  Punch In
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Live GPS Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <LiveGpsRadar />
          </div>
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 h-full flex flex-col justify-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">Manager & Administrator Sign In</h4>
                  <p className="text-xs text-slate-500">Access payroll, geofence radius settings, and attendance reports</p>
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  id="btn-admin-portal-login"
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Company / Administrator Sign In</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Clock & Shift Info */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: User & Time */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
              <BrandLogo size="sm" variant="dark" showSubtitle={false} />

              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const myShift = shifts.find((s) => s.id === currentUser.assignedShiftId) || shifts[0];
                  return (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        Shift: {myShift?.name || 'Standard'} ({myShift?.startTime || '09:00'} - {myShift?.endTime || '17:30'})
                      </span>
                    </div>
                  );
                })()}

                {isAdmin && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/30 border border-purple-500/40 text-xs text-purple-300 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Admin</span>
                  </div>
                )}

                {/* High-visibility Log Out / Exit Button */}
                <button
                  onClick={logout}
                  id="btn-banner-logout"
                  title="Log out of current staff session"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-xs text-red-300 font-medium transition cursor-pointer"
                >
                  <LogOut className="w-3 h-3 text-red-400" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Welcome, {currentUser.name}
                </h2>
                {isAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/30 text-purple-300 border border-purple-400/40">
                    Administrator
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/30 text-blue-300 border border-blue-400/40">
                    Staff Member
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {currentUser.designation} • {currentUser.department}
              </p>

              {/* Quick Staff Switcher for Shared Terminal & Punch Clock (Visible only to Admin) */}
              {isAdmin ? (
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    Admin Staff Selector:
                  </span>
                  <select
                    value={currentUser.id}
                    onChange={(e) => {
                      if (e.target.value === 'logout') {
                        logout();
                        return;
                      }
                      const selected = employees.find((emp) => emp.id === e.target.value);
                      if (selected) {
                        if (selected.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com') {
                          setIsLoginModalOpen(true);
                        } else {
                          setCurrentUser(selected);
                        }
                      }
                    }}
                    id="select-staff-punch-user"
                    aria-label="Select Staff Name for Attendance Punch"
                    className="bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    <optgroup label="Registered Staff (Mobile Verified)">
                      {eligibleStaff.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.designation})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Admin Access">
                      {employees
                        .filter((e) => e.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com')
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            👑 {emp.name} (Admin)
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Session Actions">
                      <option value="logout">🚪 Log Out / Clear Session</option>
                    </optgroup>
                  </select>
                </div>
              ) : (
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Company: <strong className="text-slate-200">DRK Goods Enterprise</strong></span>
                </div>
              )}
            </div>

            {/* Big Live Digital Clock */}
            <div className="flex items-baseline gap-3 pt-2">
              <div className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-white">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-sm text-slate-400 font-medium">
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {/* Shift & Day-wise Week Off Info Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Shift: {assignedShift.name} ({assignedShift.startTime} - {assignedShift.endTime})</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                <span>Week Off:</span>
                <strong className="font-bold">{userWeekOffDays.length > 0 ? userWeekOffDays.join(', ') : 'None'}</strong>
              </span>
              {todayIsOff && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-pulse">
                  🏖️ Today is your Scheduled Day-wise Week Off
                </span>
              )}
            </div>
          </div>

          {/* Right: Quick Work Status & Punch Buttons */}
          <div className="lg:col-span-5 bg-slate-800/60 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Today's Work Status
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  activePunchStatus === 'checked_in'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : activePunchStatus === 'on_break'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {activePunchStatus === 'checked_in'
                  ? 'Active / Working'
                  : activePunchStatus === 'on_break'
                  ? 'On Break'
                  : 'Not Clocked In'}
              </span>
            </div>

            {/* Timer Counter */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Elapsed Active Time:</span>
              </div>
              <div className="font-mono text-lg font-bold text-blue-400">
                {formatElapsedTime(elapsedSeconds)}
              </div>
            </div>

            {/* Geofence Perimeter Alert Banner */}
            {!isGpsEnforced ? (
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  GPS Requirement Disabled: Remote Check-In / Out Allowed Anywhere
                </span>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                  Remote Mode
                </span>
              </div>
            ) : !isWithinGeofence ? (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                isAdmin
                  ? 'bg-purple-500/20 border border-purple-500/40 text-purple-200'
                  : 'bg-red-500/20 border border-red-500/40 text-red-300'
              }`}>
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className="leading-tight">
                  {isAdmin ? (
                    <>
                      <strong>Admin Authority (Anywhere Out Enabled):</strong> You are {distanceToOffice}m from {currentOffice.name}. As Administrator, you can <strong>Punch Out from anywhere</strong> (kahin se bhi out maar sakte hain).
                    </>
                  ) : (
                    <>
                      <strong>Outside Geofence:</strong> You are {distanceToOffice}m from {currentOffice.name}. Attendance marking is locked until you enter the worksite.
                    </>
                  )}
                </span>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  GPS Locked: Inside {currentOffice.name} ({distanceToOffice}m)
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                  Max {currentOffice.radiusMeters}m
                </span>
              </div>
            )}

            {/* Punch Action Buttons */}
            <div className="space-y-2">
              {activePunchStatus === 'out' ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleInitiatePunch('check_in')}
                    id="btn-punch-check-in"
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    <span>GPS Check-In (Security PIN)</span>
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      {todayRecord?.checkOutTime
                        ? `Shift ended at ${formatIsoToLocalTime(todayRecord.checkOutTime)}`
                        : todayRecord?.checkInTime
                        ? `Clocked in at ${formatIsoToLocalTime(todayRecord.checkInTime)}`
                        : 'Currently clocked out'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleInitiatePunch('check_out')}
                      id="btn-punch-check-out-direct"
                      className="text-[11px] font-medium text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Record Check-Out</span>
                    </button>
                  </div>
                </div>
              ) : activePunchStatus === 'checked_in' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleInitiatePunch('break_start')}
                    id="btn-punch-break-start"
                    className="py-3.5 px-3 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white font-medium text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Coffee className="w-4 h-4" />
                    <span>Start Break</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInitiatePunch('check_out')}
                    id="btn-punch-check-out"
                    className="py-3.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>GPS Check-Out</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleInitiatePunch('break_end')}
                    id="btn-punch-break-end"
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>End Break & Resume Work</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInitiatePunch('check_out')}
                    id="btn-punch-break-checkout"
                    className="w-full py-2.5 px-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Direct Check-Out (End Shift)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick security notice */}
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Verified via 4-Digit Mobile OTP
              </span>
              <span className="text-slate-500 font-mono">{currentUser.phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: GPS Radar on Left, Today's Timeline & Stats on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: GPS Radar & Location Validation */}
        <div className="lg:col-span-5 space-y-6">
          <LiveGpsRadar />

          {/* Assigned Worksite Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Assigned Worksite
              </h4>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium">
                Radius: {currentOffice.radiusMeters}m
              </span>
            </div>

            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-slate-900">{currentOffice.name}</p>
              <p className="text-xs text-slate-500 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{currentOffice.address}</span>
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Your Distance:</span>
              <span
                className={`font-semibold font-mono ${
                  isWithinGeofence ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {distanceToOffice} meters {isWithinGeofence ? '(Allowed)' : '(Out-of-Bounds)'}
              </span>
            </div>
          </div>

          {/* Leave Quick Action Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="font-semibold text-slate-900 text-sm">Need Time Off?</h4>
              <p className="text-xs text-slate-500">Submit leave requests to your manager</p>
            </div>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition shadow-xs"
              id="btn-open-leave-modal"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </button>
          </div>
        </div>

        {/* Right Column: Today's Timeline & Personal Stats */}
        <div className="lg:col-span-7 space-y-6">
          {/* Today's Punch Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Today's Punch Activity</h3>
                <p className="text-xs text-slate-500">GPS logs & OTP verification audit trail</p>
              </div>
              <span className="text-xs font-mono bg-blue-50 text-blue-800 font-semibold px-2.5 py-1 rounded-lg border border-blue-100">
                {formatIsoToLocalDate(new Date(), { includeWeekday: true })}
              </span>
            </div>

            {(!todayRecord || todayRecord.punches.length === 0) ? (
              <div className="text-center py-8 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700">No punches logged yet today</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click the green "GPS Check-In with OTP" button above when you are at your worksite.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayRecord.punches.map((punch, idx) => (
                  <div
                    key={punch.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white ${
                          punch.type === 'check_in'
                            ? 'bg-emerald-600'
                            : punch.type === 'check_out'
                            ? 'bg-red-600'
                            : 'bg-amber-500'
                        }`}
                      >
                        {punch.type === 'check_in' ? (
                          <LogIn className="w-4 h-4" />
                        ) : punch.type === 'check_out' ? (
                          <LogOut className="w-4 h-4" />
                        ) : (
                          <Coffee className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs capitalize">
                            {punch.type.replace('_', ' ')}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              punch.overrideNote?.includes('10 Hours') || punch.overrideNote?.includes('Auto Punch Out')
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : punch.isWithinGeofence
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {punch.overrideNote?.includes('10 Hours') || punch.overrideNote?.includes('Auto Punch Out')
                              ? 'Auto 10h Completed'
                              : punch.isWithinGeofence
                              ? 'GPS Verified'
                              : 'Out-of-Bounds'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {punch.locationName} • {punch.distanceFromOfficeMeters}m from center
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Coords: {punch.coordinates.latitude}, {punch.coordinates.longitude} • OTP Verified
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-800 text-sm block">
                        {formatIsoToLocalTime(punch.timestamp, { includeSeconds: true })}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatIsoToLocalDate(punch.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Attendance Records & Simplified PDF Export */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900 text-base">Monthly Attendance & PDF Export</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  GPS-verified punch logs, work hours, and downloadable monthly statement
                </p>
              </div>

              {/* Action Buttons: Month Select & Download / PDF Export */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  id="select-attendance-month"
                  aria-label="Select Attendance Month"
                  className="px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {availableMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleExportMonthlyAttendanceExcel}
                  id="btn-export-monthly-attendance-excel"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Download Attendance in Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportMonthlyAttendancePdf}
                  id="btn-export-monthly-attendance-pdf"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>

                {myPayroll && (
                  <button
                    type="button"
                    onClick={() => exportEmployeePaySlipPdf(currentUser, myPayroll, attendance, currentOffice)}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                    id="btn-download-my-payslip"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-600" />
                    <span>Pay Slip PDF</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsAppDownloadOpen(true)}
                  id="btn-install-mobile-app-staff"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Download & Install DRK Goods App on your Mobile Phone"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDownloadCenterOpen(true)}
                  id="btn-open-download-center-staff"
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Open Download Center with all reports"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Reports</span>
                </button>
              </div>
            </div>

            {/* Monthly KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Days Present</span>
                <p className="text-sm font-bold text-slate-900">{monthStats.daysPresent} Days</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Work Hours</span>
                <p className="text-sm font-bold text-blue-600">{monthStats.totalHours} hrs</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overtime</span>
                <p className="text-sm font-bold text-amber-600">{monthStats.totalOtHours} hrs</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Punctuality</span>
                <p className="text-sm font-bold text-emerald-600">{monthStats.onTimeRate}%</p>
              </div>
            </div>

            {/* Attendance Table */}
            {displayedAttendance.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-slate-700">No attendance records logged for {availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth}</p>
                <p className="text-[11px] text-slate-400">Punches logged with GPS verification will populate this monthly ledger automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Check-In</th>
                      <th className="py-2.5 px-3">Check-Out</th>
                      <th className="py-2.5 px-3 text-right">Work Hours</th>
                      <th className="py-2.5 px-3 text-right">Overtime</th>
                      <th className="py-2.5 px-3 text-center">GPS Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {formatIsoToLocalDate(rec.date)}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {formatIsoToLocalDate(rec.date, { includeWeekday: true }).split(',')[0]}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              rec.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'late'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-mono font-medium whitespace-nowrap">
                          {formatIsoToLocalTime(rec.checkInTime)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-mono font-medium whitespace-nowrap">
                          {formatIsoToLocalTime(rec.checkOutTime)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                          {(rec.totalWorkMinutes / 60).toFixed(1)}h
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-600 font-medium">
                          {rec.overtimeMinutes > 0 ? `${(rec.overtimeMinutes / 60).toFixed(1)}h` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {rec.punches && rec.punches.some((p) => p.isWithinGeofence) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Standard</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {selectedPunchType && (
        <OtpVerificationModal
          isOpen={isOtpModalOpen}
          onClose={() => {
            setIsOtpModalOpen(false);
            setSelectedPunchType(null);
          }}
          punchType={selectedPunchType}
          onSuccess={handlePunchSuccess}
        />
      )}

      {/* Leave Application Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-slate-100">Apply for Leave</h3>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="annual">Annual Paid Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Reason / Details</label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Provide reason for supervisor review..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-500/20"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enterprise Download Center Modal */}
      <DownloadCenterModal
        isOpen={isDownloadCenterOpen}
        onClose={() => setIsDownloadCenterOpen(false)}
      />

      {/* DRK Goods Mobile App Download & Install Modal */}
      <AppDownloadModal
        isOpen={isAppDownloadOpen}
        onClose={() => setIsAppDownloadOpen(false)}
      />
    </div>
  );
};
