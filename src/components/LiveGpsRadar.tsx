import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Radio,
  RefreshCw,
  ShieldAlert,
  CheckCircle,
  ExternalLink,
  Layers,
  Map,
  Building2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDistance, formatCoordinates, getGoogleMapsUrl, getOpenStreetMapEmbedUrl } from '../utils/geo';

export const LiveGpsRadar: React.FC = () => {
  const {
    currentOffice,
    gpsCoords,
    isGpsLoading,
    gpsError,
    refreshGps,
    simulateGpsLocation,
    isSimulatedLocation,
    distanceToOffice,
    isWithinGeofence,
    currentUser,
  } = useApp();

  const [viewMode, setViewMode] = useState<'radar' | 'map'>('radar');

  const activeLat = gpsCoords?.latitude ?? currentOffice.latitude;
  const activeLng = gpsCoords?.longitude ?? currentOffice.longitude;
  const googleMapsUrl = getGoogleMapsUrl(activeLat, activeLng, currentUser?.name || 'Staff Location');
  const osmEmbedUrl = getOpenStreetMapEmbedUrl(activeLat, activeLng, 0.0035);

  // Calculate percentage offset for visual radar pin
  // Max radar radius represents 350m
  const visualMaxMeters = Math.max(currentOffice.radiusMeters * 2.2, 400);
  const ratio = Math.min(distanceToOffice / visualMaxMeters, 0.92);
  
  // Angle derived from lat/lon diff
  let angle = 45;
  if (gpsCoords) {
    const dLat = gpsCoords.latitude - currentOffice.latitude;
    const dLon = gpsCoords.longitude - currentOffice.longitude;
    angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
  }

  const pinDistancePx = ratio * 105; // Radar radius is ~120px
  const radAngle = ((angle - 90) * Math.PI) / 180;
  const pinX = 130 + Math.cos(radAngle) * pinDistancePx;
  const pinY = 130 + Math.sin(radAngle) * pinDistancePx;

  // Geofence radius in radar px
  const geofenceRadiusPx = Math.min((currentOffice.radiusMeters / visualMaxMeters) * 105, 110);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${isWithinGeofence ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Real-Time GPS Location Tracking</h3>
            <p className="text-xs text-slate-500">{currentOffice.name} • {currentOffice.address}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle View Mode */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center text-xs">
            <button
              onClick={() => setViewMode('radar')}
              className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition ${
                viewMode === 'radar' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              id="btn-view-radar"
            >
              <Radio className="w-3 h-3 text-blue-600" />
              <span>Radar</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition ${
                viewMode === 'map' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              id="btn-view-map"
            >
              <Map className="w-3 h-3 text-emerald-600" />
              <span>Map</span>
            </button>
          </div>

          <button
            onClick={refreshGps}
            disabled={isGpsLoading}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium inline-flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            id="btn-refresh-gps"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isGpsLoading ? 'Locating...' : 'Sync GPS'}</span>
          </button>
        </div>
      </div>

      {/* Visual Container: Radar OR Interactive Map */}
      {viewMode === 'radar' ? (
        <div className="relative w-full h-64 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
          {/* Radar Background Rings & Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
          
          {/* Concentric distance rings */}
          <div className="absolute w-52 h-52 rounded-full border border-slate-800/80" />
          <div className="absolute w-36 h-36 rounded-full border border-slate-800/60" />
          <div className="absolute w-20 h-20 rounded-full border border-slate-800/40" />

          {/* Crosshair axes */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-slate-800/60" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800/60" />

          {/* Dynamic Sweeping Radar Beam */}
          <div className="absolute w-60 h-60 rounded-full pointer-events-none origin-center animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(59,130,246,0.15)_360deg)]" />

          {/* Geofence Perimeter (Green circle) */}
          <div
            className="absolute rounded-full border-2 border-dashed border-emerald-500/70 bg-emerald-500/10 pointer-events-none transition-all duration-500 flex items-center justify-center"
            style={{
              width: `${geofenceRadiusPx * 2}px`,
              height: `${geofenceRadiusPx * 2}px`,
            }}
          >
            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-slate-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
              {currentOffice.radiusMeters}m Geofence
            </span>
          </div>

          {/* Office Center Marker */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-500/30 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            <span className="text-[9px] text-slate-300 font-medium bg-slate-900/90 px-1.5 py-0.5 rounded mt-1 border border-slate-700 whitespace-nowrap">
              Office Hub
            </span>
          </div>

          {/* User Current Position Marker (SVG / Canvas Overlay) */}
          <div
            className="absolute z-20 transition-all duration-700 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${Math.max(15, Math.min(245, pinX))}px`,
              top: `${Math.max(15, Math.min(245, pinY))}px`,
            }}
          >
            <div className="relative flex flex-col items-center">
              {/* Pulsing Aura */}
              <div className={`w-6 h-6 rounded-full animate-ping opacity-75 ${
                isWithinGeofence ? 'bg-emerald-400' : 'bg-red-500'
              }`} />
              
              {/* Main Pin */}
              <div className={`absolute top-0 w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${
                isWithinGeofence
                  ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30'
                  : 'bg-red-500 text-white ring-4 ring-red-500/30'
              }`}>
                <Radio className="w-3.5 h-3.5" />
              </div>

              {/* Label */}
              <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full mt-7 shadow-md border whitespace-nowrap ${
                isWithinGeofence
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600/50'
                  : 'bg-red-950 text-red-300 border-red-600/50'
              }`}>
                You: {formatDistance(distanceToOffice)}
              </span>
            </div>
          </div>

          {/* Top-Right Status Badge */}
          <div className="absolute top-2.5 right-2.5 z-20">
            <div className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 backdrop-blur-md border ${
              isWithinGeofence
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                : 'bg-red-950/80 text-red-300 border-red-700/60'
            }`}>
              {isWithinGeofence ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Geofence Passed</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>Out-of-Bounds ({formatDistance(distanceToOffice)})</span>
                </>
              )}
            </div>
          </div>

          {/* Bottom Coordinates Readout */}
          <div className="absolute bottom-2.5 left-2.5 z-20">
            <div className="text-[10px] text-slate-400 font-mono bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
              LAT: {activeLat.toFixed(6)} • LON: {activeLng.toFixed(6)} (±{gpsCoords?.accuracy || 8}m)
            </div>
          </div>
        </div>
      ) : (
        /* Embedded OpenStreetMap View */
        <div className="relative w-full h-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
          <iframe
            title="Live GPS Worksite Map"
            src={osmEmbedUrl}
            className="w-full h-full border-0"
            loading="lazy"
          />

          {/* Floating badge */}
          <div className="absolute top-2.5 left-2.5 z-10 bg-slate-900/90 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-mono border border-slate-700">
            📍 {formatCoordinates(activeLat, activeLng)}
          </div>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2.5 right-2.5 z-10 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-medium shadow-md flex items-center gap-1 transition"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open in Google Maps</span>
          </a>
        </div>
      )}

      {/* GPS Location Telemetry & Device Status */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-1.5 font-medium text-slate-800">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Active Coordinates: <strong className="font-mono text-slate-900">{formatCoordinates(activeLat, activeLng)}</strong></span>
          </div>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>View on Google Maps</span>
          </a>
        </div>

        {/* Security & Perimeter Lock Status */}
        <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
          isWithinGeofence
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
            : 'bg-red-50/80 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isWithinGeofence ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-semibold">
              {isWithinGeofence
                ? `GPS Locked: Inside ${currentOffice.name} (${distanceToOffice}m)`
                : `Outside Geofence: ${distanceToOffice}m away (Attendance Blocked)`}
            </span>
          </div>
          <button
            type="button"
            onClick={refreshGps}
            disabled={isGpsLoading}
            className="text-[11px] font-semibold underline text-blue-700 hover:text-blue-900 cursor-pointer"
          >
            {isGpsLoading ? 'Syncing...' : 'Sync GPS'}
          </button>
        </div>

        {/* Admin GPS Simulation Bar (Only for testing/diagnostics) */}
        {currentUser?.role === 'admin' && (
          <div className="pt-2 border-t border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-purple-700">Admin Geofence Diagnostic Controls:</span>
              <span className="text-[10px] text-slate-400">Punches strictly require valid perimeter</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => simulateGpsLocation('at_office')}
                id="btn-sim-at-office"
                className={`px-2 py-1 rounded-lg text-xs font-medium transition border flex items-center justify-center gap-1 cursor-pointer ${
                  isWithinGeofence && isSimulatedLocation
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-3 h-3 text-emerald-500" />
                <span>Simulate In (24m)</span>
              </button>

              <button
                type="button"
                onClick={() => simulateGpsLocation('out_of_bounds')}
                id="btn-sim-out-of-bounds"
                className={`px-2 py-1 rounded-lg text-xs font-medium transition border flex items-center justify-center gap-1 cursor-pointer ${
                  !isWithinGeofence
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-3 h-3 text-red-500" />
                <span>Simulate Out (450m)</span>
              </button>

              <button
                type="button"
                onClick={refreshGps}
                id="btn-sim-real-gps"
                className={`px-2 py-1 rounded-lg text-xs font-medium transition border flex items-center justify-center gap-1 cursor-pointer ${
                  !isSimulatedLocation
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Radio className="w-3 h-3 text-blue-400" />
                <span>Real Device GPS</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
