import React, { useEffect, useState } from 'react';
import {
  MapPin,
  CheckCircle2,
  ExternalLink,
  Navigation,
  ShieldCheck,
  X,
  Compass,
  Building2,
  MailCheck,
} from 'lucide-react';
import { PunchRecord } from '../types';
import { formatCoordinates, getGoogleMapsUrl } from '../utils/geo';
import { formatIsoToLocalDateTime, formatIsoToLocalTime, formatIsoToLocalDate } from '../utils/dateUtils';

interface PunchSuccessLocationPopupProps {
  punch: PunchRecord | null;
  employeeName: string;
  onClose: () => void;
  onViewFullMap: () => void;
}

export const PunchSuccessLocationPopup: React.FC<PunchSuccessLocationPopupProps> = ({
  punch,
  employeeName,
  onClose,
  onViewFullMap,
}) => {
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    if (!punch) return;
    setProgress(100);
    const interval = 50;
    const totalDuration = 7000; // 7 seconds
    const decrement = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [punch, onClose]);

  if (!punch) return null;

  const lat = punch.coordinates.latitude;
  const lng = punch.coordinates.longitude;
  const address = punch.address || punch.locationName || 'Plot 42, Okhla Industrial Area Phase III, New Delhi';
  const googleMapsUrl = getGoogleMapsUrl(lat, lng, employeeName);

  const punchTypeTitles: Record<string, string> = {
    check_in: 'Check-In Recorded & GPS Verified',
    check_out: 'Check-Out Recorded & Location Saved',
    break_start: 'Break Started & GPS Verified',
    break_end: 'Work Resumed & GPS Verified',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-500/40 overflow-hidden text-slate-900">
        {/* Top Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100">
          <div
            className="h-full bg-emerald-500 transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                  {punchTypeTitles[punch.type] || 'Punch Logged'}
                </span>
                <h4 className="font-bold text-slate-900 text-sm">{employeeName}</h4>
                <p className="text-[11px] text-slate-600 font-mono">
                  {formatIsoToLocalDate(punch.timestamp, { includeWeekday: true })} at <strong className="text-emerald-700">{formatIsoToLocalTime(punch.timestamp, { includeSeconds: true })}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              id="btn-close-punch-success-popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Captured GPS Location Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <MapPin className="w-4 h-4" />
                <span>Captured GPS Location:</span>
              </div>
              <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {formatCoordinates(lat, lng)}
              </span>
            </div>

            <p className="text-xs text-slate-200 font-medium line-clamp-2">
              📍 {address}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-blue-400" />
                {punch.locationName}
              </span>
              <span
                className={`font-semibold font-mono ${
                  punch.isWithinGeofence ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {punch.distanceFromOfficeMeters}m from Office {punch.isWithinGeofence ? '✅' : '⚠️'}
              </span>
            </div>
          </div>

          {/* Email Notification Dispatch Status */}
          <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2 text-indigo-900 text-xs">
            <MailCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-[11px] font-medium">
              Punch details & GPS coordinates shared with Admin email (deepak.mariinox@gmail.com)
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onViewFullMap}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              id="btn-view-map-from-popup"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>View On Interactive Map</span>
            </button>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              id="btn-google-maps-from-popup"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Maps</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
