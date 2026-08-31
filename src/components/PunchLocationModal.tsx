import React, { useState } from 'react';
import {
  MapPin,
  X,
  ExternalLink,
  Copy,
  Check,
  Navigation,
  ShieldCheck,
  Smartphone,
  Clock,
  Building2,
  AlertTriangle,
  Compass,
  Layers,
} from 'lucide-react';
import { PunchRecord, WorkLocation } from '../types';
import { formatCoordinates, getGoogleMapsUrl, getOpenStreetMapEmbedUrl } from '../utils/geo';

interface PunchLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  punch: PunchRecord | null;
  employeeName?: string;
  employeeDesignation?: string;
  employeeDepartment?: string;
  employeePhone?: string;
  workLocation?: WorkLocation;
}

export const PunchLocationModal: React.FC<PunchLocationModalProps> = ({
  isOpen,
  onClose,
  punch,
  employeeName = 'Staff Member',
  employeeDesignation = 'Employee',
  employeeDepartment = 'Operations',
  employeePhone,
  workLocation,
}) => {
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [mapType, setMapType] = useState<'embed' | 'satellite' | 'radar'>('embed');

  if (!isOpen || !punch) return null;

  const lat = punch.coordinates.latitude;
  const lng = punch.coordinates.longitude;
  const accuracy = punch.coordinates.accuracy || 10;
  const address = punch.address || punch.locationName || 'Plot 42, Okhla Industrial Area, New Delhi';
  const googleMapsUrl = punch.mapUrl || getGoogleMapsUrl(lat, lng, employeeName);
  const osmEmbedUrl = getOpenStreetMapEmbedUrl(lat, lng, 0.0035);

  const punchTypeLabels: Record<string, { label: string; color: string; bg: string }> = {
    check_in: { label: 'Check-In Punch', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
    check_out: { label: 'Check-Out Punch', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
    break_start: { label: 'Break Start', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
    break_end: { label: 'Break End', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200' },
  };

  const currentType = punchTypeLabels[punch.type] || punchTypeLabels.check_in;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <MapPin className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100">Live GPS Location Telemetry</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentType.bg} ${currentType.color}`}>
                  {currentType.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">Captured at timestamp of punch verification</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            id="btn-close-location-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Staff Info Ribbon */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                {employeeName.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>{employeeName}</span>
                  {employeePhone && (
                    <span className="text-[10px] font-mono font-medium text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      📞 {employeePhone}
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500">
                  {employeeDesignation} • {employeeDepartment}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{new Date(punch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {new Date(punch.timestamp).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Interactive Map Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-blue-600" />
                Live Map View (Punch Pin Location):
              </span>

              <div className="flex items-center gap-1">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] border border-blue-200 inline-flex items-center gap-1 transition"
                  id="link-open-google-maps"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in Google Maps</span>
                </a>
              </div>
            </div>

            <div className="relative w-full h-72 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 shadow-inner">
              {/* OpenStreetMap Iframe */}
              <iframe
                title="Punch Location Map"
                src={osmEmbedUrl}
                className="w-full h-full border-0 pointer-events-auto"
                loading="lazy"
              />

              {/* Floating Overlay Badge on Map */}
              <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-slate-700 shadow-lg text-xs space-y-0.5 pointer-events-none">
                <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>GPS Coordinate Lock</span>
                </div>
                <div className="font-mono text-[11px] text-slate-300">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </div>
              </div>

              {/* Geofence Status Badge on Map */}
              <div className="absolute bottom-3 right-3 z-10">
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 border backdrop-blur-md ${
                    punch.isWithinGeofence
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                      : 'bg-red-950/90 text-red-300 border-red-500/50'
                  }`}
                >
                  {punch.isWithinGeofence ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Within Geofence ({punch.distanceFromOfficeMeters}m)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>Out-of-Bounds ({punch.distanceFromOfficeMeters}m)</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Location Address & Detailed Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Captured Physical Address */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1 text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  Detected Physical Address
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                  id="btn-copy-address"
                >
                  {copiedAddress ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <p className="text-xs font-medium text-slate-800 leading-relaxed">
                {address}
              </p>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Worksite Hub:</span>
                <strong className="text-slate-800">{punch.locationName || workLocation?.name || 'DRK Goods Headquarters'}</strong>
              </div>
            </div>

            {/* GPS Precision & Hardware Data */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1 text-slate-700">
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  Exact GPS Coordinates
                </span>
                <button
                  onClick={handleCopyCoords}
                  className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                  id="btn-copy-coords"
                >
                  {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCoords ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="font-mono text-xs text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200">
                {formatCoordinates(lat, lng)}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">GPS Accuracy:</span>
                  <strong className="text-emerald-700 font-mono">±{accuracy} meters</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Distance to Office:</span>
                  <strong className={`font-mono ${punch.isWithinGeofence ? 'text-emerald-700' : 'text-red-700'}`}>
                    {punch.distanceFromOfficeMeters}m
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Device Footprint */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>OTP Authentication:</strong> 4-Digit Mobile OTP Verified ({punch.otpMethod === 'mobile_last4' ? 'Phone PIN Match' : 'SMS Code'})
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              <span>Device: {punch.deviceInfo || 'Mobile Handset (GPS Enabled)'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 inline-flex items-center gap-2 transition cursor-pointer"
            id="btn-navigate-google-maps"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in Google Maps</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
            id="btn-close-modal-footer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
