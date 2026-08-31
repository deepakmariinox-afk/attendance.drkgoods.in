import React, { useState } from 'react';
import {
  MapPin,
  Building2,
  Plus,
  Edit2,
  CheckCircle,
  Radio,
  Sliders,
  AlertCircle,
  Trash2,
  Users,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { WorkLocation } from '../types';
import { formatCoordinates, getGoogleMapsUrl } from '../utils/geo';

export const GeofenceManager: React.FC = () => {
  const { locations, addLocation, updateLocation, deleteLocation, employees, currentUser } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<WorkLocation | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<WorkLocation | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(28.646708);
  const [longitude, setLongitude] = useState<number>(77.243340);
  const [radiusMeters, setRadiusMeters] = useState<number>(200);

  const handleOpenAdd = () => {
    setName('');
    setAddress('');
    setLatitude(28.646708);
    setLongitude(77.243340);
    setRadiusMeters(200);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (loc: WorkLocation) => {
    setEditingLocation(loc);
    setName(loc.name);
    setAddress(loc.address);
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setRadiusMeters(loc.radiusMeters);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    if (editingLocation) {
      updateLocation(editingLocation.id, {
        name,
        address,
        latitude,
        longitude,
        radiusMeters,
      });
      setEditingLocation(null);
    } else {
      addLocation({
        name,
        address,
        latitude,
        longitude,
        radiusMeters,
      });
      setIsAddModalOpen(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!locationToDelete) return;
    deleteLocation(locationToDelete.id);
    setLocationToDelete(null);
    if (editingLocation?.id === locationToDelete.id) {
      setEditingLocation(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
              Geofence Configuration
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Authorized Worksites & GPS Perimeters</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure, manage, and remove physical office locations and permissible check-in radiuses
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 inline-flex items-center gap-2 transition cursor-pointer"
            id="btn-add-geofence"
          >
            <Plus className="w-4 h-4" />
            <span>Add Work Location</span>
          </button>
        )}
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {locations.map((loc) => {
          const assignedCount = employees.filter((e) => e.assignedLocationId === loc.id).length;
          const canDelete = locations.length > 1;

          return (
            <div
              key={loc.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition relative"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {loc.radiusMeters}m Radius
                    </span>
                    {loc.isDefault && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        HQ
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base">{loc.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{loc.address}</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 font-mono text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="font-medium text-slate-800">{formatCoordinates(loc.latitude, loc.longitude)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Staff Assigned:</span>
                    <span className="font-semibold text-blue-700 flex items-center gap-1 font-sans">
                      <Users className="w-3.5 h-3.5" />
                      {assignedCount} employee{assignedCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-sans text-[11px]">
                    <span className="text-slate-400 font-mono">Google Maps:</span>
                    <a
                      href={getGoogleMapsUrl(loc.latitude, loc.longitude, loc.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                    >
                      <span>View Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {currentUser.role === 'admin' && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setLocationToDelete(loc)}
                    disabled={!canDelete}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer ${
                      canDelete
                        ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200'
                        : 'text-slate-400 border border-slate-200 bg-slate-50 cursor-not-allowed'
                    }`}
                    title={canDelete ? 'Remove this office location' : 'Cannot delete the only remaining office location'}
                    id={`btn-delete-loc-${loc.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Remove</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(loc)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                    id={`btn-edit-loc-${loc.id}`}
                  >
                    <Edit2 className="w-3 h-3 text-slate-500" />
                    <span>Configure</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal to Remove Location */}
      {locationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
            <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertTriangle className="w-5 h-5 text-white" />
                <span>Remove Office Location</span>
              </div>
              <button
                onClick={() => setLocationToDelete(null)}
                className="text-red-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 text-sm">
                Are you sure you want to remove <strong className="text-slate-900 font-bold">{locationToDelete.name}</strong> from authorized worksites?
              </p>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 font-mono text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-400">Address: </span>
                  <span className="text-slate-900 font-sans">{locationToDelete.address}</span>
                </div>
                <div>
                  <span className="text-slate-400">Coordinates: </span>
                  <span className="text-slate-800">{formatCoordinates(locationToDelete.latitude, locationToDelete.longitude)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Radius: </span>
                  <span className="text-slate-800">{locationToDelete.radiusMeters} meters</span>
                </div>
              </div>

              {employees.filter((e) => e.assignedLocationId === locationToDelete.id).length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1 text-xs">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>
                      {employees.filter((e) => e.assignedLocationId === locationToDelete.id).length} staff assigned
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    All staff stationed at this location will automatically be reassigned to{' '}
                    <strong>{locations.find((l) => l.id !== locationToDelete.id)?.name || 'the primary office'}</strong>.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLocationToDelete(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  id="btn-cancel-delete-loc"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  id="btn-confirm-delete-loc"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Remove Location</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Geofence Modal */}
      {(isAddModalOpen || editingLocation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {editingLocation ? 'Configure Geofence Perimeter' : 'Add New Worksite Geofence'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingLocation(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Worksite Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. DRK Goods - Main Office"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. DRK Goods Facility, Delhi NCR"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-medium text-slate-700">
                    Allowed Geofence Radius: <strong className="text-blue-600">{radiusMeters}m</strong>
                  </label>
                </div>
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={10}
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>50m (Strict Room)</span>
                  <span>250m (Standard Campus)</span>
                  <span>500m (Large Yard)</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {editingLocation && locations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const toDel = editingLocation;
                      setEditingLocation(null);
                      setLocationToDelete(toDel);
                    }}
                    className="px-3 py-2.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium flex items-center justify-center gap-1 cursor-pointer"
                    id="btn-modal-delete-loc"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingLocation(null);
                  }}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {editingLocation ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

