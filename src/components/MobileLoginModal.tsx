import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  UserCheck,
  PhoneCall,
  Lock,
  Building,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Employee } from '../types';

interface MobileLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileLoginModal: React.FC<MobileLoginModalProps> = ({ isOpen, onClose }) => {
  const { employees, currentUser, requestLoginOtp, loginWithPhone, showNotification } = useApp();

  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [matchedEmployee, setMatchedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isAdmin = Boolean(
    currentUser &&
    (currentUser.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com' ||
      (currentUser.phone || '').replace(/\D/g, '') === '9971336707') &&
    currentUser.role === 'admin'
  );

  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhoneNumber('');
      setPinDigits(['', '', '', '']);
      setMatchedEmployee(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProceedToPin = (overridePhone?: string, overrideEmp?: Employee) => {
    const targetPhone = overridePhone !== undefined ? overridePhone : phoneNumber;
    const empToUse = overrideEmp || matchedEmployee;

    if (!targetPhone.trim() && !empToUse) {
      setError('Please enter your mobile phone number.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const res = requestLoginOtp(targetPhone || empToUse?.id || '', empToUse?.id);
      setIsSubmitting(false);

      if (res.success && res.employee) {
        setMatchedEmployee(res.employee);
        setPhoneNumber(res.employee.phone || targetPhone);
        setStep('pin');
        
        // Compute expected 4-digit PIN (last 4 of phone)
        const cleanP = (res.employee.phone || targetPhone || '').replace(/\D/g, '');
        const expectedPin = cleanP.slice(-4) || '1234';
        
        // Auto-focus input
        setTimeout(() => pinInputRefs[0].current?.focus(), 150);
      } else {
        setError(res.message);
      }
    }, 250);
  };

  const handleQuickSelect = (emp: Employee) => {
    const isEmpAdmin = emp.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
    setMatchedEmployee(emp);

    if (isEmpAdmin) {
      const adminPhone = emp.phone || '9971336707';
      setPhoneNumber(adminPhone);
      handleProceedToPin(adminPhone, emp);
    } else if (emp.phone && emp.phone.trim().length >= 4) {
      setPhoneNumber(emp.phone);
      handleProceedToPin(emp.phone, emp);
    } else {
      setPhoneNumber('');
      setError(`Mobile number is not registered for ${emp.name}. Only the Administrator (Deepak Yadav) can register or update staff mobile numbers. To record your attendance, please select your name directly on the Attendance Clock.`);
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
      const isEmpAdmin = matchedEmployee.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
      const pinCode = cleanP.slice(-4) || (isEmpAdmin ? '6707' : '1234');
      setPinDigits(pinCode.split(''));
      setError(null);
      pinInputRefs[3].current?.focus();
    }
  };

  const handleVerifyPin = () => {
    const enteredPin = pinDigits.join('');
    if (enteredPin.length < 4) {
      setError('Please enter your complete 4-digit Security PIN.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    setTimeout(() => {
      const res = loginWithPhone(phoneNumber, enteredPin);
      setIsSubmitting(false);

      if (res.success) {
        showNotification('success', res.message);
        onClose();
      } else {
        setError(res.message);
      }
    }, 250);
  };

  const cleanPhone = (matchedEmployee?.phone || phoneNumber).replace(/\D/g, '');
  const expectedLast4 = cleanPhone.slice(-4) || '****';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 uppercase tracking-wider mb-1">
                  <Lock className="w-3 h-3" />
                  Mobile PIN Authentication
                </div>
                <h3 className="font-bold text-lg text-white">Workforce & Admin Login</h3>
                <p className="text-xs text-slate-400">Sign in with registered mobile phone & 4-digit PIN</p>
              </div>
            </div>

            <button
              onClick={onClose}
              id="btn-close-mobile-login"
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">
          {step === 'phone' ? (
            <div className="space-y-5">
              {/* Admin Highlight Banner - ONLY shown if current session is Admin */}
              {isAdmin && (
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-purple-950">Primary Administrator</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-200 text-purple-900">
                        Full Access
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800 font-mono mt-0.5">
                      deepak.mariinox@gmail.com • Mob: 9971336707
                    </p>
                    <p className="text-[10px] text-purple-700 mt-1 leading-snug">
                      Administrator access is verified and active on this device.
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Mobile or Email Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Enter Registered Mobile Number or Email
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 border-r border-slate-200 pr-2">
                    <PhoneCall className="w-4 h-4 text-blue-600" />
                  </div>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter 10-digit mobile number or admin email"
                    id="input-mobile-phone"
                    className="w-full pl-12 pr-4 py-3.5 text-sm font-mono font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleProceedToPin();
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Staff accounts automatically open Attendance Clock upon verification.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Proceed to PIN Button */}
              <button
                type="button"
                onClick={() => handleProceedToPin()}
                disabled={isSubmitting || (!phoneNumber.trim() && !matchedEmployee)}
                id="btn-get-login-otp"
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Checking Registration...</span>
                ) : (
                  <>
                    <span>Continue with Security PIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick-Pick Registered Staff Directory */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Registered Staff (Mobile Verified)
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">1-Click Select</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {employees
                    .filter((e) => {
                      const isEmpAdmin = e.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
                      if (isAdmin) return true;
                      return !isEmpAdmin && !!(e.phone && e.phone.trim().length >= 4);
                    })
                    .map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleQuickSelect(emp)}
                        id={`btn-select-user-${emp.id}`}
                        className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition group flex items-center justify-between cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-700 truncate">
                              {emp.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-700">
                              {emp.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com' ? 'Admin' : 'Staff'}
                            </span>
                          </div>
                          <div className="text-[10px] mt-0.5 truncate font-mono text-blue-700">
                            {emp.phone || emp.email}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 shrink-0 ml-2" />
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Matched Profile Badge */}
              {matchedEmployee && (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {matchedEmployee.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {matchedEmployee.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          matchedEmployee.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : matchedEmployee.role === 'manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {matchedEmployee.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {matchedEmployee.phone ? `+91 ${matchedEmployee.phone}` : matchedEmployee.email}
                    </p>
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
              )}

              {/* 4 Digit PIN Boxes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Enter 4-Digit Security PIN
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoFillPin}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Auto-fill PIN ({expectedLast4})</span>
                  </button>
                </div>
                <div className="flex justify-center gap-3">
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={pinInputRefs[idx]}
                      id={`pin-input-${idx}`}
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
                  Your Security PIN is the <strong>last 4 digits of your registered mobile number</strong>.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleVerifyPin}
                  disabled={isSubmitting || pinDigits.some((d) => d === '')}
                  id="btn-verify-login-otp"
                  className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Verifying Security PIN...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Sign In</span>
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
            <span>DRK Goods Enterprise Security</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">1 Device per Number</span>
        </div>
      </div>
    </div>
  );
};
