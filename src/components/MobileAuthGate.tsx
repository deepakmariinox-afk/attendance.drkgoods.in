import React, { useState, useRef } from 'react';
import {
  Smartphone,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  PhoneCall,
  Lock,
  Building,
  Download,
  Check,
  FileCode,
  ShieldAlert,
  UserCheck,
  Clock,
  Search,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Employee } from '../types';
import { downloadStandaloneHtmlLauncher } from '../utils/fileDownloader';
import { normalizePhone10 } from '../utils/dateUtils';

interface MobileAuthGateProps {
  onOpenAppDownloadModal?: () => void;
}

export const MobileAuthGate: React.FC<MobileAuthGateProps> = ({ onOpenAppDownloadModal }) => {
  const { employees, shifts, requestLoginOtp, loginWithPhone, showNotification, syncWithServer } = useApp();

  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [matchedEmployee, setMatchedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const [loginMode, setLoginMode] = useState<'quick' | 'manual'>('quick');
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>('');
  const [isRefreshingSync, setIsRefreshingSync] = useState<boolean>(false);

  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleManualSync = async () => {
    setIsRefreshingSync(true);
    try {
      await syncWithServer();
      showNotification('success', 'Staff directory synchronized with latest server records.');
    } catch {
      // ignore
    } finally {
      setIsRefreshingSync(false);
    }
  };

  const sortedAndFilteredEmployees = employees
    .filter((emp) => {
      if (!quickSearchQuery.trim()) return true;
      const q = quickSearchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/\D/g, '');
      const empPhoneClean = (emp.phone || '').replace(/\D/g, '');
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.designation?.toLowerCase().includes(q) ||
        (cleanQ && empPhoneClean.includes(cleanQ))
      );
    })
    .sort((a, b) => {
      // Primary Admin first
      const aIsAdmin =
        (a.phone || '').replace(/\D/g, '') === '9971336707' ||
        a.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
      const bIsAdmin =
        (b.phone || '').replace(/\D/g, '') === '9971336707' ||
        b.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;
      return a.name.localeCompare(b.name);
    });

  const handleProceedToPin = async (overridePhone?: string, overrideEmp?: Employee) => {
    const targetPhone = overridePhone !== undefined ? overridePhone : phoneNumber;
    const empToUse = overrideEmp || matchedEmployee;

    const cleanInput = (targetPhone || '').replace(/\D/g, '');

    if (!cleanInput && !empToUse && !targetPhone.includes('@')) {
      setError('Please enter your 10-digit registered mobile number.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Sync fresh directory from server
      await syncWithServer();
    } catch {
      // ignore
    }

    setTimeout(() => {
      const res = requestLoginOtp(targetPhone || empToUse?.id || '', empToUse?.id);
      setIsSubmitting(false);

      if (res.success && res.employee) {
        setMatchedEmployee(res.employee);
        setPhoneNumber(res.employee.phone || targetPhone);
        setStep('pin');

        // Auto-focus PIN box
        setTimeout(() => pinInputRefs[0].current?.focus(), 150);
      } else {
        // Strict Error: Not registered in Staff Directory
        setError(
          `Access Denied: Mobile number +91 ${cleanInput || targetPhone} is not registered in the Staff Directory. Only candidates & staff whose mobile number and name are added in the Staff Directory can log in. Please contact Administrator Deepak Yadav (9971336707) to register your name & number.`
        );
      }
    }, 200);
  };

  const handleQuickSelect = (emp: Employee) => {
    setMatchedEmployee(emp);
    const cleanPhone = (emp.phone || '').replace(/\D/g, '');
    if (cleanPhone.length >= 4) {
      setPhoneNumber(emp.phone);
      handleProceedToPin(emp.phone, emp);
    } else {
      setError(
        `Mobile number not registered for ${emp.name}. Only Administrator (Deepak Yadav - 9971336707) can add or update candidate mobile numbers.`
      );
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    setError(null);

    const newDigits = [...pinDigits];
    newDigits[index] = val.slice(-1);
    setPinDigits(newDigits);

    // Auto-advance
    if (val && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
  };

  const handleAutoFillPin = () => {
    if (matchedEmployee) {
      const cleanP = (matchedEmployee.phone || phoneNumber).replace(/\D/g, '');
      const isEmpAdmin =
        cleanP === '9971336707' ||
        matchedEmployee.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
      const pinCode = cleanP.slice(-4) || (isEmpAdmin ? '6707' : '1234');
      setPinDigits(pinCode.split(''));
      setError(null);
      pinInputRefs[3].current?.focus();
    }
  };

  const handleVerifyPin = () => {
    const enteredPin = pinDigits.join('');
    if (enteredPin.length < 4) {
      setError('Please enter your complete 4-digit Security PIN / OTP.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    setTimeout(() => {
      const res = loginWithPhone(phoneNumber, enteredPin, matchedEmployee?.id);
      setIsSubmitting(false);

      if (res.success) {
        showNotification('success', res.message);
      } else {
        setError(res.message);
      }
    }, 250);
  };

  const handleDownloadAppCheck = () => {
    // Universal App Download: Anyone can download and install the app freely!
    const appUrl = window.location.href.split('?')[0];
    downloadStandaloneHtmlLauncher(appUrl, 'DRK Goods Enterprise');
    setDownloadSuccess(true);
    showNotification('success', 'DRK Goods Mobile App downloaded! Anyone can install and open the app on Android/iPhone/PC.');
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  const cleanPhone = (matchedEmployee?.phone || phoneNumber).replace(/\D/g, '');
  const expectedLast4 = cleanPhone.slice(-4) || '****';
  const isTargetAdmin =
    cleanPhone === '9971336707' ||
    matchedEmployee?.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 font-sans">
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-slate-950 text-white p-6 relative border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 uppercase tracking-wider mb-1">
                <Lock className="w-3 h-3" />
                Mobile Authentication Gate
              </div>
              <h2 className="font-extrabold text-xl text-white tracking-tight">DRK Goods Enterprise</h2>
              <p className="text-xs text-slate-400">Workforce Geofence Attendance & Payroll</p>
            </div>
          </div>

          {/* Single Admin Access Rule Badge */}
          <div className="mt-4 p-2.5 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-300">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-semibold text-[11px]">Primary Admin Authorized:</span>
            </div>
            <span className="font-mono font-bold text-purple-200 text-xs bg-purple-900/80 px-2 py-0.5 rounded border border-purple-700/60">
              +91 9971336707
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {step === 'phone' ? (
            <div className="space-y-4">
              {/* Access Policy Note */}
              <div className="p-3 rounded-2xl bg-blue-50/90 border border-blue-200/80 flex items-start gap-2.5 text-xs text-blue-950">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Official Workforce Gate:</strong> Access authorized for pre-registered candidates & staff. Tap your name in <strong>Quick Pick</strong> or enter your mobile number.
                </p>
              </div>

              {/* Login Mode Tabs: Quick Pick (Default) vs Type Mobile */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('quick');
                    setError(null);
                  }}
                  id="tab-btn-quick-pick"
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === 'quick'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Quick Pick ({employees.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('manual');
                    setError(null);
                  }}
                  id="tab-btn-manual-phone"
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === 'manual'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>⌨️ Type Number</span>
                </button>
              </div>

              {/* TAB 1: QUICK PICK DIRECTORY (PRIMARY / DEFAULT) */}
              {loginMode === 'quick' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Select Your Name to Log In
                    </span>
                    <button
                      type="button"
                      onClick={handleManualSync}
                      disabled={isRefreshingSync}
                      id="btn-quick-pick-sync"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition cursor-pointer"
                      title="Sync with latest Staff Directory additions"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingSync ? 'animate-spin text-blue-600' : ''}`} />
                      <span>{isRefreshingSync ? 'Syncing...' : 'Auto-Sync'}</span>
                    </button>
                  </div>

                  {/* Live Search inside Quick Pick */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={quickSearchQuery}
                      onChange={(e) => setQuickSearchQuery(e.target.value)}
                      placeholder="Search by name, mobile, department..."
                      id="input-quick-search-staff"
                      className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                    />
                    {quickSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setQuickSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Staff List Cards */}
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {sortedAndFilteredEmployees.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No staff matched "{quickSearchQuery}". Check registered numbers or click Auto-Sync.
                      </div>
                    ) : (
                      sortedAndFilteredEmployees.map((emp) => {
                        const isEmpAdmin =
                          (emp.phone || '').replace(/\D/g, '') === '9971336707' ||
                          emp.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
                        const empShift = shifts.find((s) => s.id === emp.assignedShiftId) || shifts[0];
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => handleQuickSelect(emp)}
                            id={`btn-quick-select-${emp.id}`}
                            className={`w-full text-left p-3 rounded-2xl border transition group flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                              isEmpAdmin
                                ? 'border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 hover:border-purple-400 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/60 shadow-xs'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700 truncate">
                                  {emp.name}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wide ${
                                    isEmpAdmin
                                      ? 'bg-purple-200 text-purple-900 border border-purple-300'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  }`}
                                >
                                  {isEmpAdmin ? '👑 Primary Admin' : 'Staff Member'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  • {emp.department}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono mt-1 flex-wrap">
                                <span className="font-bold text-slate-900">
                                  📞 +91 {emp.phone || '9971336707'}
                                </span>
                                {empShift && (
                                  <span className="font-sans font-medium text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                    🕒 {empShift.name} ({empShift.startTime} - {empShift.endTime})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <span className="text-[10px] font-bold text-blue-600 group-hover:underline">
                                Tap to Login
                              </span>
                              <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition" />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: MANUAL NUMBER ENTRY */}
              {loginMode === 'manual' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Enter Registered Mobile Number
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-500 font-mono text-sm border-r border-slate-200 pr-2">
                        <PhoneCall className="w-4 h-4 text-blue-600" />
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          setError(null);
                        }}
                        placeholder="Enter 10-digit registered number"
                        id="input-gate-mobile-phone"
                        className="w-full pl-20 pr-4 py-3 text-base font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleProceedToPin();
                        }}
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Enter your 10-digit mobile number as registered by DRK Goods HR.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleProceedToPin()}
                    disabled={isSubmitting || !phoneNumber.trim()}
                    id="btn-gate-continue-otp"
                    className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Checking Registration...</span>
                    ) : (
                      <>
                        <span>Verify Mobile & Enter OTP / PIN</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Error Box */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* App Download Section (Compact Footer) */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Install App on Device
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Free for All Staff
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadAppCheck}
                    id="btn-gate-download-app"
                    className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer border border-slate-700"
                  >
                    {downloadSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Downloaded!</span>
                      </>
                    ) : (
                      <>
                        <FileCode className="w-3.5 h-3.5 text-blue-400" />
                        <span>Download .HTML</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAppDownloadModal) {
                        onOpenAppDownloadModal();
                      } else {
                        handleDownloadAppCheck();
                      }
                    }}
                    id="btn-gate-install-pwa"
                    className="py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Install on Phone</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Matched Profile Badge */}
              {matchedEmployee && (() => {
                const empShift = shifts.find((s) => s.id === matchedEmployee.assignedShiftId) || shifts[0];
                return (
                  <div
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                      isTargetAdmin
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 text-white ${
                        isTargetAdmin ? 'bg-purple-700' : 'bg-blue-600'
                      }`}
                    >
                      {matchedEmployee.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {matchedEmployee.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isTargetAdmin
                              ? 'bg-purple-200 text-purple-900'
                              : 'bg-blue-200 text-blue-900'
                          }`}
                        >
                          {isTargetAdmin ? 'Admin Access (9971336707)' : 'Candidate Access'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                        +91 {matchedEmployee.phone || '9971336707'}
                      </p>
                      {empShift && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded-md border border-purple-200">
                          <Clock className="w-3 h-3 text-purple-600" />
                          <span>Assigned Shift: {empShift.name} ({empShift.startTime} - {empShift.endTime})</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setPinDigits(['', '', '', '']);
                        setError(null);
                      }}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                );
              })()}

              {/* 4 Digit OTP / Security PIN Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Enter 4-Digit OTP / PIN
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoFillPin}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Auto-fill OTP ({expectedLast4})</span>
                  </button>
                </div>

                <div className="flex justify-center gap-3">
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={pinInputRefs[idx]}
                      id={`gate-pin-input-${idx}`}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-13 h-14 text-center text-2xl font-bold font-mono text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition"
                    />
                  ))}
                </div>
                <p className="text-center text-[11px] text-slate-500">
                  Your Security PIN / OTP is the <strong>last 4 digits of your registered phone</strong>.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Verify Button */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleVerifyPin}
                  disabled={isSubmitting || pinDigits.some((d) => d === '')}
                  id="btn-gate-verify-pin"
                  className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Verifying OTP / PIN...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Access Portal</span>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setPinDigits(['', '', '', '']);
                      setError(null);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    ← Back to Phone Selection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400" />
            <span>DRK Goods Enterprise</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">Strict Device & Phone Lock</span>
        </div>
      </div>
    </div>
  );
};
