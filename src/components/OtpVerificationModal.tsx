import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  AlertCircle,
  X,
  CheckCircle2,
  MapPin,
  LogOut,
  LogIn,
  Coffee,
  Play,
  Compass,
  Navigation,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PunchType } from '../types';
import { formatCoordinates } from '../utils/geo';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  punchType: PunchType;
  onSuccess: () => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  onClose,
  punchType,
  onSuccess,
}) => {
  const {
    currentUser,
    clockInOut,
    currentOffice,
    isWithinGeofence,
    distanceToOffice,
    gpsCoords,
    refreshGps,
    isGpsLoading,
    showNotification,
  } = useApp();

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Extract last 4 digits of current user's phone or fallback to standard 1234 code
  const cleanPhone = (currentUser?.phone || '').replace(/\D/g, '');
  const isAdmin =
    currentUser?.role === 'admin' ||
    cleanPhone.endsWith('9971336707') ||
    currentUser?.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
  const expectedPin = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : (isAdmin ? '6707' : '1234');

  const isAdminRemoteOut = isAdmin && (punchType === 'check_out');

  useEffect(() => {
    if (isOpen && currentUser) {
      // Pre-fill with the user's PIN for 1-touch convenience
      const chars = expectedPin.split('');
      setDigits(chars);
      setError(null);
      setTimeout(() => inputRefs[3].current?.focus(), 150);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    setError(null);

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto-advance
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleAutoFill = () => {
    const chars = expectedPin.split('');
    setDigits(chars);
    setError(null);
    inputRefs[3].current?.focus();
  };

  const handleVerify = async () => {
    if (!isWithinGeofence && !isAdminRemoteOut) {
      setError(`Punch Denied: You are ${distanceToOffice}m away from ${currentOffice.name} (Authorized radius: ${currentOffice.radiusMeters}m). Attendance cannot be marked outside the authorized geofence.`);
      return;
    }

    const enteredPin = digits.join('');
    if (enteredPin.length < 4) {
      setError('Please enter your complete 4-digit Security PIN.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await clockInOut(punchType, enteredPin, false, undefined);

      if (res.success) {
        showNotification('success', res.message);
        onSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const punchLabels: Record<PunchType, string> = {
    check_in: 'GPS Check-In Verification',
    break_start: 'Break Start Verification',
    break_end: 'Break End Verification',
    check_out: 'GPS Check-Out Verification',
  };

  const punchIcons: Record<PunchType, React.ReactNode> = {
    check_in: <LogIn className="w-5 h-5 text-emerald-400" />,
    break_start: <Coffee className="w-5 h-5 text-amber-400" />,
    break_end: <Play className="w-5 h-5 text-blue-400" />,
    check_out: <LogOut className="w-5 h-5 text-red-400" />,
  };

  const isCheckOut = punchType === 'check_out';
  const activeLat = gpsCoords?.latitude || currentOffice.latitude;
  const activeLng = gpsCoords?.longitude || currentOffice.longitude;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between text-white ${
          isCheckOut ? 'bg-slate-900 border-b border-red-900/30' : 'bg-slate-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isCheckOut
                ? 'bg-red-600/20 border-red-500/40 text-red-400'
                : 'bg-blue-600/20 border-blue-500/40 text-blue-400'
            }`}>
              {punchIcons[punchType]}
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100">{punchLabels[punchType]}</h3>
              <p className="text-xs text-slate-400">Live GPS & Security PIN Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            id="btn-close-otp"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Live GPS Telemetry Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Navigation className="w-4 h-4 animate-pulse" />
                <span>Live Location Telemetry</span>
              </div>
              <button
                type="button"
                onClick={refreshGps}
                disabled={isGpsLoading}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                id="btn-refresh-gps-in-modal"
              >
                <RefreshCw className={`w-3 h-3 ${isGpsLoading ? 'animate-spin' : ''}`} />
                <span>{isGpsLoading ? 'Locating...' : 'Refresh GPS'}</span>
              </button>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Target Geofence:</span>
                <strong className="text-slate-100">{currentOffice.name}</strong>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Coordinates:</span>
                <span className="font-mono text-emerald-400">{formatCoordinates(activeLat, activeLng)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700">
                <span className="text-slate-400">Office Distance:</span>
                <span className={`font-bold font-mono ${isWithinGeofence || isAdminRemoteOut ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {distanceToOffice}m ({isWithinGeofence ? 'Inside Perimeter' : isAdminRemoteOut ? 'Admin Remote Out Allowed' : 'Outside Perimeter'})
                </span>
              </div>
              {isAdminRemoteOut && !isWithinGeofence && (
                <div className="text-[10px] text-purple-300 font-semibold bg-purple-950/80 px-2 py-1 rounded border border-purple-800/80 flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  <span>Admin Authority: You can punch out from anywhere!</span>
                </div>
              )}
            </div>
          </div>

          {/* User & Security PIN Info Card */}
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900">{currentUser.name}</span>
              </div>
              {currentUser.phone && (
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono text-[10px] font-semibold">
                  📞 +91 {currentUser.phone}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-200/60">
              <span className="text-slate-600">
                Security PIN: <strong className="text-blue-900 font-mono text-xs bg-white px-2 py-0.5 rounded border border-blue-200">{expectedPin}</strong>
              </span>
              <span className="text-slate-500 text-[10px]">
                (Last 4 digits of phone)
              </span>
            </div>
          </div>

          {/* 4 Digit PIN Boxes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
              <label className="uppercase tracking-wider">
                Enter 4-Digit Security PIN
              </label>
              <button
                type="button"
                onClick={handleAutoFill}
                id="btn-autofill-otp"
                className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Auto-Fill PIN ({expectedPin})</span>
              </button>
            </div>
            <div className="flex justify-center gap-3">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  id={`otp-input-${idx}`}
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
          </div>

          {/* Geofence Out of Bounds Security Banner */}
          {!isWithinGeofence && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-red-700 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Attendance Prohibited: Outside Worksite Geofence</span>
              </div>
              <p className="text-[11px] text-red-600 leading-relaxed">
                Your device is <strong>{distanceToOffice}m</strong> away from <strong>{currentOffice.name}</strong> (Allowed radius: {currentOffice.radiusMeters}m). Marking attendance is strictly forbidden when outside the designated worksite.
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition text-xs cursor-pointer"
              id="btn-cancel-otp"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={isLoading || !isWithinGeofence}
              className={`flex-1 px-4 py-3 rounded-2xl text-white font-semibold shadow-md transition text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                !isWithinGeofence
                  ? 'bg-slate-400 text-slate-200 shadow-none'
                  : isCheckOut
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
              }`}
              id="btn-confirm-otp"
            >
              {isLoading ? (
                <span>Logging GPS & Punch...</span>
              ) : !isWithinGeofence ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Outside Geofence (Blocked)</span>
                </>
              ) : (
                <>
                  {isCheckOut ? <LogOut className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{isCheckOut ? 'Verify & Check Out' : 'Verify & Punch'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
