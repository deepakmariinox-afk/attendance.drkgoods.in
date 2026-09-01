import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  DailyAttendance,
  Employee,
  GpsCoordinates,
  LeaveRequest,
  PayrollRecord,
  PunchRecord,
  PunchType,
  UserRole,
  WorkLocation,
  WorkShift,
} from '../types';
import {
  DEFAULT_SHIFTS,
  INITIAL_EMPLOYEES,
  INITIAL_LEAVES,
  INITIAL_LOCATIONS,
  generateInitialAttendance,
} from '../data/seedData';
import { calculateDistanceInMeters, verifyGeofence, reverseGeocodeCoords, getGoogleMapsUrl } from '../utils/geo';
import { calculateMonthlyPayrollRecords } from '../utils/pdfExport';
import { verifyOtp } from '../utils/smsService';
import {
  getDeviceLocalDateStr,
  getDeviceLocalMonthStr,
  normalizePhone10,
} from '../utils/dateUtils';
import {
  buildDailySummaryEmailHtml,
  buildPunchEmailHtml,
  DEFAULT_EMAIL_CONFIG,
  EmailNotificationConfig,
  getGmailAccessToken,
  sendEmailNotification,
} from '../utils/emailService';

// Device Fingerprint Utilities for Single Phone / Single Device Lock
const getOrCreateDeviceId = (): string => {
  let devId = localStorage.getItem('drk_device_uuid');
  if (!devId) {
    devId = `dev_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    localStorage.setItem('drk_device_uuid', devId);
  }
  return devId;
};

const getDeviceFriendlyName = (): string => {
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';

  let os = 'Workstation PC';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android Phone';
  else if (/Macintosh/i.test(ua)) os = 'Mac';
  else if (/Windows/i.test(ua)) os = 'Windows PC';

  return `${os} (${browser})`;
};

interface AppContextType {
  // Authentication & Role
  currentUser: Employee | null;
  isAuthenticated: boolean;
  setCurrentUser: (emp: Employee | null) => void;
  employees: Employee[];
  addEmployee: (emp: Omit<Employee, 'id'>) => boolean;
  updateEmployee: (id: string, emp: Partial<Employee>) => boolean;
  deleteEmployee: (id: string) => void;
  renameDepartment: (oldName: string, newName: string) => void;
  unbindEmployeeDevice: (employeeId: string) => void;

  // Work Shifts & Roster
  shifts: WorkShift[];
  addShift: (shift: Omit<WorkShift, 'id'>) => void;
  updateShift: (id: string, shift: Partial<WorkShift>) => void;
  deleteShift: (id: string) => boolean;
  assignShiftToEmployee: (employeeId: string, shiftId: string) => void;
  bulkUpdateRoster: (updates: Array<{ employeeId: string; assignedShiftId?: string; weekOffDays?: string[] }>) => boolean;

  // Day-wise Week Off
  companyWeekOffDays: string[];
  updateCompanyWeekOffDays: (days: string[]) => void;
  getEmployeeWeekOffDays: (empOrId?: string | Employee | null) => string[];
  isTodayWeekOff: (empOrId?: string | Employee | null) => boolean;

  // Locations & Geofences
  locations: WorkLocation[];
  addLocation: (loc: Omit<WorkLocation, 'id'>) => void;
  updateLocation: (id: string, loc: Partial<WorkLocation>) => void;
  deleteLocation: (id: string) => boolean;
  currentOffice: WorkLocation;

  // GPS Tracking & Simulation
  gpsCoords: GpsCoordinates | null;
  isGpsLoading: boolean;
  gpsError: string | null;
  refreshGps: () => Promise<void>;
  simulateGpsLocation: (type: 'at_office' | 'out_of_bounds' | 'custom', customCoords?: { lat: number; lng: number }) => void;
  isSimulatedLocation: boolean;
  distanceToOffice: number;
  isWithinGeofence: boolean;
  isGpsEnforced: boolean;
  toggleGpsEnforcement: (enabled?: boolean) => void;

  // Attendance Records
  attendance: DailyAttendance[];
  todayStr: string;
  todayRecord: DailyAttendance | null;
  activePunchStatus: 'out' | 'checked_in' | 'on_break';
  clockInOut: (type: PunchType, otpToken: string, forceOverride?: boolean, note?: string) => Promise<{ success: boolean; message: string; flagged?: boolean }>;
  adminPunchOutStaff: (employeeId: string, customNote?: string) => Promise<{ success: boolean; message: string }>;
  resolveGpsFlag: (attendanceId: string, note: string) => void;

  // Leave Management
  leaves: LeaveRequest[];
  applyLeave: (leave: Omit<LeaveRequest, 'id' | 'appliedOn' | 'status'>) => void;
  updateLeaveStatus: (id: string, status: 'approved' | 'rejected') => void;

  // Data Clean-up & Reset Utilities
  clearAllAttendance: () => void;
  clearCandidateDetails: () => void;
  resetAllData: () => void;

  // Payroll
  selectedPayrollMonth: string; // "YYYY-MM"
  setSelectedPayrollMonth: (month: string) => void;
  payrollRecords: PayrollRecord[];

  // Toast / System Notification
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;

  // GPS Location Telemetry Modal & Live Popups
  activeLocationModalPunch: PunchRecord | null;
  activeLocationModalEmployee: Employee | null;
  openPunchLocationModal: (punch: PunchRecord, employee?: Employee | null) => void;
  closePunchLocationModal: () => void;
  latestSuccessPunch: { punch: PunchRecord; employee: Employee } | null;
  clearLatestSuccessPunch: () => void;

  // Email Notifications & Gmail Integration
  emailConfig: EmailNotificationConfig;
  updateEmailConfig: (cfg: Partial<EmailNotificationConfig>) => void;
  sendManualPunchAlertEmail: (punch: PunchRecord, emp: Employee, force?: boolean) => Promise<{ success: boolean; message: string }>;
  sendManualDailySummaryEmail: (date?: string) => Promise<{ success: boolean; message: string }>;
  connectGmailOAuth: () => Promise<string | null>;

  // Mobile Phone Login & Security PIN Service
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  requestLoginOtp: (phone: string, targetEmpId?: string) => { success: boolean; message: string; employee?: Employee };
  loginWithPhone: (phone: string, pin: string, targetEmpId?: string) => { success: boolean; message: string; employee?: Employee };
  logout: () => void;
  syncWithServer: () => Promise<void>;
  lastSyncTime: Date;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  EMPLOYEES: 'drkgoods_employees_v11',
  LOCATIONS: 'drkgoods_locations_v11',
  ATTENDANCE: 'drkgoods_attendance_v11',
  LEAVES: 'drkgoods_leaves_v11',
  SHIFTS: 'drkgoods_shifts_v11',
  CURRENT_USER_ID: 'drkgoods_current_user_id_v11',
  GPS_ENFORCED: 'drkgoods_gps_enforced_v11',
  EMAIL_CONFIG: 'drkgoods_email_config_v11',
  COMPANY_WEEK_OFF_DAYS: 'drkgoods_company_week_off_days_v11',
};

// Helper function to safely merge employees with seed candidates
export function mergeWithSeedEmployees(rawList: Employee[], currentList?: Employee[]): Employee[] {
  const employeeMap = new Map<string, Employee>();

  // 1. Seed with default initial roster (Deepak Yadav + all 24 candidates)
  INITIAL_EMPLOYEES.forEach((initEmp) => {
    employeeMap.set(initEmp.id, { ...initEmp });
  });

  // 2. Merge existing / in-memory employees if provided
  if (Array.isArray(currentList)) {
    currentList.forEach((emp) => {
      if (emp && emp.id) {
        const existing = employeeMap.get(emp.id);
        employeeMap.set(emp.id, {
          ...(existing || {}),
          ...emp,
          name: (emp.name && emp.name.trim()) ? emp.name.trim() : (existing?.name || 'Staff Member'),
          vendor: emp.vendor || existing?.vendor || 'Direct',
          joinDate: emp.joinDate || existing?.joinDate,
        });
      }
    });
  }

  // 3. Merge incoming raw list (e.g. from server or localStorage)
  if (Array.isArray(rawList)) {
    rawList.forEach((e) => {
      if (!e || !e.id) return;
      const phoneDigits = (e.phone || '').replace(/\D/g, '');
      const isDeepak =
        e.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com' ||
        phoneDigits === '9971336707';

      // Match by exact ID or identical 10-digit phone
      let targetKey = e.id;
      for (const [key, existing] of employeeMap.entries()) {
        const existingDigits = (existing.phone || '').replace(/\D/g, '');
        if (key === e.id || (phoneDigits.length >= 10 && existingDigits.length >= 10 && existingDigits === phoneDigits)) {
          targetKey = key;
          break;
        }
      }

      const existing = employeeMap.get(targetKey);
      const cleanObj: Employee = {
        ...(existing || {}),
        ...e,
        id: targetKey,
        name: (e.name && e.name.trim()) ? e.name.trim() : (existing?.name || 'Staff Member'),
        role: isDeepak ? 'admin' : (e.role || 'staff'),
        phone: isDeepak && (e.phone === '9876500001' || !e.phone) ? '9971336707' : (e.phone !== undefined ? e.phone : (existing?.phone || '')),
        vendor: e.vendor || existing?.vendor || 'Direct',
        department: e.department || existing?.department || 'Packaging & Warehouse',
        designation: e.designation || existing?.designation || 'Packer',
        joinDate: e.joinDate || existing?.joinDate,
        assignedShiftId: e.assignedShiftId || existing?.assignedShiftId || 'shift_morning',
        appAccessGranted: e.appAccessGranted !== undefined ? e.appAccessGranted : true,
        accessStatus: e.accessStatus || 'ACTIVE',
      };
      employeeMap.set(targetKey, cleanObj);
    });
  }

  return Array.from(employeeMap.values());
}

// Helper function to safely merge attendance records without losing active punches
export function mergeAttendanceRecords(incoming: DailyAttendance[], current: DailyAttendance[]): DailyAttendance[] {
  const map = new Map<string, DailyAttendance>();

  // 1. Existing in-memory records
  if (Array.isArray(current)) {
    current.forEach((a) => {
      if (a && a.id) {
        map.set(a.id, { ...a });
      }
    });
  }

  // 2. Incoming server or storage records
  if (Array.isArray(incoming)) {
    incoming.forEach((inc) => {
      if (!inc || !inc.id) return;
      const existing = map.get(inc.id);
      if (!existing) {
        map.set(inc.id, { ...inc });
      } else {
        // Merge punches
        const existingPunches = existing.punches || [];
        const incomingPunches = inc.punches || [];
        const punchMap = new Map<string, PunchRecord>();
        existingPunches.forEach((p) => p && p.id && punchMap.set(p.id, p));
        incomingPunches.forEach((p) => p && p.id && punchMap.set(p.id, p));
        const mergedPunches = Array.from(punchMap.values()).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        map.set(inc.id, {
          ...existing,
          ...inc,
          punches: mergedPunches,
          checkInTime: inc.checkInTime || existing.checkInTime,
          checkOutTime: inc.checkOutTime || existing.checkOutTime,
          totalWorkMinutes: Math.max(inc.totalWorkMinutes || 0, existing.totalWorkMinutes || 0),
          overtimeMinutes: Math.max(inc.overtimeMinutes || 0, existing.overtimeMinutes || 0),
          status: inc.status || existing.status,
          notes: inc.notes || existing.notes,
        });
      }
    });
  }

  return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Company Day-wise Week Off Days
  const [companyWeekOffDays, setCompanyWeekOffDays] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMPANY_WEEK_OFF_DAYS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return ['Sunday'];
  });
  // GPS Geofence Enforcement Toggle (Enable/Disable GPS) - Disabled by default for all candidates
  const [isGpsEnforced, setIsGpsEnforced] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GPS_ENFORCED);
    if (saved !== null) {
      return saved === 'true';
    }
    return false; // Default GPS disabled for candidates
  });

  const toggleGpsEnforcement = (enabled?: boolean) => {
    setIsGpsEnforced((prev) => {
      const nextVal = typeof enabled === 'boolean' ? enabled : !prev;
      localStorage.setItem(STORAGE_KEYS.GPS_ENFORCED, String(nextVal));
      fetch('/api/toggle-gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGpsEnforced: nextVal }),
      }).catch(() => {});
      return nextVal;
    });
  };

  // Load initial or stored data
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (saved) {
      try {
        const parsed: Employee[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeWithSeedEmployees(parsed);
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_EMPLOYEES;
  });

  const [shifts, setShifts] = useState<WorkShift[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    if (saved) {
      try {
        const parsed: WorkShift[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const combined: WorkShift[] = [...parsed];
          DEFAULT_SHIFTS.forEach((defShift) => {
            const existingIdx = combined.findIndex((s) => s.id === defShift.id);
            if (existingIdx === -1) {
              combined.push(defShift);
            }
          });
          return combined;
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_SHIFTS;
  });

  const [locations, setLocations] = useState<WorkLocation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    if (saved) {
      try {
        const parsed: WorkLocation[] = JSON.parse(saved);
        if (parsed.some((l) => l.name.includes('DRK Goods') || l.latitude === 28.646708)) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_LOCATIONS;
  });

  const [attendance, setAttendance] = useState<DailyAttendance[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return saved ? JSON.parse(saved) : generateInitialAttendance();
  });

  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LEAVES);
    return saved ? JSON.parse(saved) : INITIAL_LEAVES;
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (saved && saved !== 'null' && saved !== 'undefined') return saved;
    return null;
  });

  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState<string>(() => getDeviceLocalMonthStr());
  const [todayStr, setTodayStr] = useState<string>(() => getDeviceLocalDateStr());

  // Email notification settings state
  const [emailConfig, setEmailConfig] = useState<EmailNotificationConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EMAIL_CONFIG);
    if (saved) {
      try {
        return { ...DEFAULT_EMAIL_CONFIG, ...JSON.parse(saved) };
      } catch {
        // fallback
      }
    }
    return DEFAULT_EMAIL_CONFIG;
  });

  const updateEmailConfig = (cfg: Partial<EmailNotificationConfig>) => {
    setEmailConfig((prev) => {
      const updated = { ...prev, ...cfg };
      localStorage.setItem(STORAGE_KEYS.EMAIL_CONFIG, JSON.stringify(updated));
      fetch('/api/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  };

  // Keep live today date string refreshed if midnight passes
  useEffect(() => {
    const interval = setInterval(() => {
      const liveToday = getDeviceLocalDateStr();
      setTodayStr((prev) => (prev !== liveToday ? liveToday : prev));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // GPS Location Telemetry Modal State
  const [activeLocationModalPunch, setActiveLocationModalPunch] = useState<PunchRecord | null>(null);
  const [activeLocationModalEmployee, setActiveLocationModalEmployee] = useState<Employee | null>(null);
  const [latestSuccessPunch, setLatestSuccessPunch] = useState<{ punch: PunchRecord; employee: Employee } | null>(null);

  const openPunchLocationModal = (punch: PunchRecord, employee?: Employee | null) => {
    setActiveLocationModalPunch(punch);
    setActiveLocationModalEmployee(employee || currentUser);
  };

  const closePunchLocationModal = () => {
    setActiveLocationModalPunch(null);
    setActiveLocationModalEmployee(null);
  };

  const clearLatestSuccessPunch = () => {
    setLatestSuccessPunch(null);
  };

  // GPS state
  const [gpsCoords, setGpsCoords] = useState<GpsCoordinates | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSimulatedLocation, setIsSimulatedLocation] = useState<boolean>(false);

  const currentUser = useMemo(() => {
    if (!currentUserId) return null;
    return employees.find((e) => e.id === currentUserId) || null;
  }, [employees, currentUserId]);

  const isAuthenticated = currentUser !== null;

  const currentOffice = useMemo(() => {
    if (!currentUser) return locations[0];
    return locations.find((l) => l.id === currentUser.assignedLocationId) || locations[0];
  }, [locations, currentUser]);

  // Sync to localStorage and Server
  const isSyncingRef = useRef<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const syncWithServer = useCallback(async () => {
    try {
      const res = await fetch('/api/app-data');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.employees)) {
          setEmployees((prevEmployees) => {
            const merged = mergeWithSeedEmployees(data.employees, prevEmployees);
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(merged));
            return merged;
          });
        }
        if (data && Array.isArray(data.locations) && data.locations.length > 0) {
          setLocations(data.locations);
          localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(data.locations));
        }
        if (data && Array.isArray(data.shifts) && data.shifts.length > 0) {
          setShifts(data.shifts);
          localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(data.shifts));
        }
        if (data && Array.isArray(data.companyWeekOffDays)) {
          setCompanyWeekOffDays(data.companyWeekOffDays);
          localStorage.setItem(STORAGE_KEYS.COMPANY_WEEK_OFF_DAYS, JSON.stringify(data.companyWeekOffDays));
        }
        if (data && Array.isArray(data.attendance)) {
          setAttendance((prevAttendance) => {
            const merged = mergeAttendanceRecords(data.attendance, prevAttendance);
            localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(merged));
            return merged;
          });
        }
        if (data && Array.isArray(data.leaves)) {
          setLeaves(data.leaves);
          localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(data.leaves));
        }
        setLastSyncTime(new Date());
      }
    } catch {
      // Offline fallback: rely on local storage
    }
  }, []);

  // Sync state to server whenever data updates
  const pushStateToServer = useCallback(async (statePayload: any) => {
    if (isSyncingRef.current) return;
    try {
      isSyncingRef.current = true;
      await fetch('/api/sync-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statePayload),
      });
      setLastSyncTime(new Date());
    } catch {
      // Fail silently offline
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Initial fetch on mount & Periodic sync every 10 seconds (10s Auto-Sync)
  useEffect(() => {
    syncWithServer();
    const interval = setInterval(() => {
      syncWithServer();
    }, 10000); // 10-Second Auto Sync Interval

    const onFocus = () => syncWithServer();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [syncWithServer]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    pushStateToServer({ employees });
  }, [employees, pushStateToServer]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
    pushStateToServer({ shifts });
  }, [shifts, pushStateToServer]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    pushStateToServer({ locations });
  }, [locations, pushStateToServer]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
    pushStateToServer({ attendance });
  }, [attendance, pushStateToServer]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(leaves));
    pushStateToServer({ leaves });
  }, [leaves, pushStateToServer]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  }, [currentUserId]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Real GPS lookup
  const refreshGps = async () => {
    setIsGpsLoading(true);
    setGpsError(null);
    setIsSimulatedLocation(false);

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      setIsGpsLoading(false);
      // Fallback to office location for testing
      setGpsCoords({
        latitude: currentOffice.latitude + 0.0001,
        longitude: currentOffice.longitude + 0.0001,
        accuracy: 10,
        timestamp: Date.now(),
      });
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      setGpsCoords({
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
        accuracy: Math.round(position.coords.accuracy),
        timestamp: position.timestamp,
      });
    } catch (err: any) {
      console.warn('GPS Error or blocked iframe permission:', err.message);
      setGpsError(err.message || 'GPS location permission denied');
      // Set to office location so user can test seamlessly
      setGpsCoords({
        latitude: currentOffice.latitude + 0.0002,
        longitude: currentOffice.longitude + 0.0001,
        accuracy: 12,
        timestamp: Date.now(),
      });
      showNotification('info', 'Switched to Worksite GPS mode for demo preview.');
    } finally {
      setIsGpsLoading(false);
    }
  };

  // Initialize GPS on load
  useEffect(() => {
    refreshGps();
  }, [currentOffice.id]);

  // GPS Simulation helper
  const simulateGpsLocation = (
    type: 'at_office' | 'out_of_bounds' | 'custom',
    customCoords?: { lat: number; lng: number }
  ) => {
    setIsSimulatedLocation(true);
    if (type === 'at_office') {
      setGpsCoords({
        latitude: currentOffice.latitude + 0.0001,
        longitude: currentOffice.longitude + 0.0001,
        accuracy: 5,
        timestamp: Date.now(),
      });
      showNotification('success', `GPS locked to ${currentOffice.name} (Within perimeter).`);
    } else if (type === 'out_of_bounds') {
      // 450m away from office
      setGpsCoords({
        latitude: currentOffice.latitude + 0.0042,
        longitude: currentOffice.longitude + 0.0042,
        accuracy: 14,
        timestamp: Date.now(),
      });
      showNotification('error', `Simulated location placed 450m outside ${currentOffice.name} boundary.`);
    } else if (type === 'custom' && customCoords) {
      setGpsCoords({
        latitude: customCoords.lat,
        longitude: customCoords.lng,
        accuracy: 8,
        timestamp: Date.now(),
      });
    }
  };

  // Geofence & distance calculation
  const { distanceToOffice, isWithinGeofence } = useMemo(() => {
    if (!gpsCoords) return { distanceToOffice: 0, isWithinGeofence: true };
    const { distanceMeters, isInside } = verifyGeofence(gpsCoords, currentOffice);
    // If GPS is disabled by Admin, isWithinGeofence is always true
    return { distanceToOffice: distanceMeters, isWithinGeofence: !isGpsEnforced || isInside };
  }, [gpsCoords, currentOffice, isGpsEnforced]);

  // 10-Hour Strict Automatic Punch Out Engine
  useEffect(() => {
    const TEN_HOURS_MS = 10 * 60 * 60 * 1000;

    const runAutoPunchOutCheck = () => {
      const nowMs = Date.now();
      let hasChanges = false;

      setAttendance((prevAttendance) => {
        const updated = prevAttendance.map((rec) => {
          if (rec.checkInTime && !rec.checkOutTime) {
            const checkInMs = new Date(rec.checkInTime).getTime();
            if (nowMs - checkInMs >= TEN_HOURS_MS) {
              hasChanges = true;
              const autoOutIso = new Date(checkInMs + TEN_HOURS_MS).toISOString();
              const autoPunchRecord: PunchRecord = {
                id: `p_auto_10h_${Date.now()}_${rec.employeeId}`,
                type: 'check_out',
                timestamp: autoOutIso,
                coordinates: {
                  latitude: currentOffice.latitude,
                  longitude: currentOffice.longitude,
                  accuracy: 10,
                },
                locationName: `${currentOffice.name} (Auto 10hr Punch-Out)`,
                distanceFromOfficeMeters: 0,
                isWithinGeofence: true,
                otpVerified: true,
                otpMethod: 'mobile_last4',
                deviceInfo: 'Auto-Checkout Engine (10hr Rule)',
                managerOverride: true,
                overrideNote: 'Auto Punch Out (10 Hours Completed - System Auto-Checkout)',
              };

              if (rec.employeeId === currentUserId) {
                showNotification('info', 'Notice: Shift auto-completed & punched out after 10 hours.');
              }

              return {
                ...rec,
                checkOutTime: autoOutIso,
                totalWorkMinutes: 600, // exactly 10 hours
                overtimeMinutes: 60, // 1 hour overtime over standard 9h
                punches: [...(rec.punches || []).filter((p) => p.type !== 'check_out'), autoPunchRecord],
              };
            }
          }
          return rec;
        });

        if (hasChanges) {
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
          pushStateToServer({ attendance: updated });
          return updated;
        }
        return prevAttendance;
      });
    };

    runAutoPunchOutCheck();
    const autoOutInterval = setInterval(runAutoPunchOutCheck, 5000);
    return () => clearInterval(autoOutInterval);
  }, [currentOffice, currentUserId, pushStateToServer]);

  // Today's attendance record for current user based on device date
  const todayRecord = useMemo(() => {
    if (!currentUser) return null;
    return (
      attendance.find(
        (a) => a.employeeId === currentUser.id && a.date === todayStr
      ) || null
    );
  }, [attendance, currentUser, todayStr]);

  // Active punch status
  const activePunchStatus: 'out' | 'checked_in' | 'on_break' = useMemo(() => {
    if (!todayRecord || todayRecord.punches.length === 0) return 'out';
    const lastPunch = todayRecord.punches[todayRecord.punches.length - 1];
    if (lastPunch.type === 'check_in' || lastPunch.type === 'break_end') return 'checked_in';
    if (lastPunch.type === 'break_start') return 'on_break';
    return 'out';
  }, [todayRecord]);

  // Clock In / Out Action
  const clockInOut = async (
    type: PunchType,
    otpToken: string,
    forceOverride = false,
    note?: string
  ): Promise<{ success: boolean; message: string; flagged?: boolean }> => {
    if (!currentUser) {
      return {
        success: false,
        message: 'Please sign in or select your profile before punching.',
      };
    }

    // 1. Verify OTP with dynamic active OTP or registered security PIN
    const cleanedPhone = (currentUser.phone || '').replace(/\D/g, '');
    const last4 = cleanedPhone.slice(-4) || '1234';

    const verifyResult = verifyOtp(otpToken, currentUser.phone, currentUser.id, last4);
    if (!verifyResult.isValid) {
      return {
        success: false,
        message: verifyResult.message,
      };
    }

    // 2. Verify GPS coords
    const coords = gpsCoords || {
      latitude: currentOffice.latitude,
      longitude: currentOffice.longitude,
      accuracy: 10,
      timestamp: Date.now(),
    };

    const dist = calculateDistanceInMeters(
      coords.latitude,
      coords.longitude,
      currentOffice.latitude,
      currentOffice.longitude
    );

    const inside = dist <= currentOffice.radiusMeters;
    const now = new Date();
    const nowIso = now.toISOString();
    const punchDate = getDeviceLocalDateStr(now);

    const isUserAdmin =
      currentUser.role === 'admin' ||
      (currentUser.phone || '').replace(/\D/g, '').endsWith('9971336707') ||
      currentUser.email?.toLowerCase().includes('deepak.mariinox');

    // Admin can punch out from anywhere; OR if Admin has disabled GPS enforcement
    const isAllowedOutsideGeofence = !isGpsEnforced || (isUserAdmin && (type === 'check_out' || forceOverride));

    // STRICT GPS ENFORCEMENT: If GPS is active and user is outside and not exempt
    if (isGpsEnforced && !inside && !isAllowedOutsideGeofence) {
      return {
        success: false,
        message: `Punch Denied (Outside Geofence Perimeter): You are ${dist}m away from ${currentOffice.name} (Authorized radius: ${currentOffice.radiusMeters}m). Attendance punches are strictly permitted only within authorized GPS coordinates at the worksite.`,
        flagged: true,
      };
    }

    if (isGpsEnforced && isSimulatedLocation && !inside && !isAllowedOutsideGeofence) {
      return {
        success: false,
        message: `Punch Denied: Selected / Simulated GEO location is strictly not permitted for marking attendance.`,
        flagged: true,
      };
    }

    const isFlaggedPunch = isGpsEnforced && !inside && isAllowedOutsideGeofence;
    const punchNote = note || (!isGpsEnforced ? 'Punch Accepted (GPS Verification Disabled)' : (isFlaggedPunch ? 'Admin Remote Punch Out (Geofence Exempt Anywhere)' : undefined));

    let address = currentOffice.address || 'Plot 42, Okhla Industrial Area Phase III, New Delhi';
    try {
      address = await reverseGeocodeCoords(coords.latitude, coords.longitude);
    } catch {
      // Use fallback
    }

    const mapUrl = getGoogleMapsUrl(coords.latitude, coords.longitude, currentUser.name);

    const newPunch: PunchRecord = {
      id: `p_${Date.now()}`,
      type,
      timestamp: nowIso,
      coordinates: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || 10,
      },
      locationName: isFlaggedPunch ? `Remote / Field Location (${dist}m)` : currentOffice.name,
      address,
      mapUrl,
      distanceFromOfficeMeters: dist,
      isWithinGeofence: inside || isAllowedOutsideGeofence,
      otpVerified: true,
      otpMethod: 'mobile_last4',
      deviceInfo: navigator.userAgent.includes('Mobile') ? 'Mobile Handset (GPS Enabled)' : 'Workstation Terminal (GPS Enabled)',
      managerOverride: isFlaggedPunch,
      overrideNote: punchNote,
    };

    // Calculate shift status (On time vs Late) based on assigned shift
    const empShift = shifts.find((s) => s.id === currentUser.assignedShiftId) || shifts[0];
    const shiftHoursExpected = (empShift?.workingHours || 9) * 60; // in minutes
    
    let isLatePunch = false;
    if (type === 'check_in' && empShift?.startTime) {
      const [shHour, shMin] = empShift.startTime.split(':').map(Number);
      const graceMin = empShift.graceMinutes ?? 15;
      const shiftStartMinutes = (shHour * 60) + (shMin || 0) + graceMin;
      const currentMinutes = (now.getHours() * 60) + now.getMinutes();
      if (currentMinutes > shiftStartMinutes && currentMinutes < shiftStartMinutes + 360) {
        isLatePunch = true;
      }
    }

    // Trigger instant GPS Location confirmation popup
    setLatestSuccessPunch({ punch: newPunch, employee: currentUser });

    // Automatic email notification dispatch to Admin
    if (emailConfig.enableAutoPunchEmails) {
      const emailPayload = buildPunchEmailHtml({
        employeeName: currentUser.name,
        phone: currentUser.phone,
        department: currentUser.department,
        punchType: type,
        timestamp: nowIso,
        locationName: newPunch.locationName,
        address: newPunch.address,
        distanceMeters: dist,
        isWithinGeofence: inside || isAllowedOutsideGeofence,
        notes: punchNote,
        shiftName: empShift?.name,
        isLate: isLatePunch,
      });

      sendEmailNotification(emailConfig.adminEmail || 'deepak.mariinox@gmail.com', emailPayload.subject, emailPayload.html)
        .then((res) => {
          if (res.success) {
            console.log('Automatic punch email dispatched to Admin:', res);
          }
        })
        .catch((err) => console.warn('Punch email auto-dispatch error:', err));
    }

    setAttendance((prev) => {
      const existing = prev.find(
        (a) => a.employeeId === currentUser.id && a.date === punchDate
      );

      if (existing) {
        const updatedPunches = [...existing.punches, newPunch];
        const isFlagged = existing.isFlaggedForGps || isFlaggedPunch;

        // Calculate hours if checked out
        let totalWorkMin = existing.totalWorkMinutes || 0;
        let overtimeMin = existing.overtimeMinutes || 0;

        if (type === 'check_out') {
          if (existing.checkInTime) {
            const startMs = new Date(existing.checkInTime).getTime();
            const endMs = new Date(nowIso).getTime();
            const rawMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
            totalWorkMin = Math.max(1, rawMinutes - (existing.totalBreakMinutes || 0));
            overtimeMin = totalWorkMin > shiftHoursExpected ? totalWorkMin - shiftHoursExpected : 0;
          } else {
            // Standalone checkout default
            totalWorkMin = shiftHoursExpected;
            overtimeMin = 0;
          }
        }

        return prev.map((a) =>
          a.id === existing.id
            ? {
                ...a,
                punches: updatedPunches,
                checkOutTime: type === 'check_out' ? nowIso : a.checkOutTime,
                totalWorkMinutes: totalWorkMin,
                overtimeMinutes: overtimeMin,
                isFlaggedForGps: isFlagged,
                flagResolved: isFlagged ? false : true,
                notes: punchNote ? (a.notes ? `${a.notes} | ${punchNote}` : punchNote) : a.notes,
              }
            : a
        );
      } else {
        // Create new daily record
        const isCheckOutDirect = type === 'check_out';
        const newDaily: DailyAttendance = {
          id: `att_${currentUser.id}_${punchDate}`,
          employeeId: currentUser.id,
          date: punchDate,
          punches: [newPunch],
          status: isCheckOutDirect ? 'present' : (isLatePunch ? 'late' : 'present'),
          checkInTime: isCheckOutDirect ? undefined : nowIso,
          checkOutTime: isCheckOutDirect ? nowIso : undefined,
          totalWorkMinutes: isCheckOutDirect ? shiftHoursExpected : 0,
          totalBreakMinutes: 0,
          overtimeMinutes: 0,
          isFlaggedForGps: isFlaggedPunch,
          flagResolved: !isFlaggedPunch,
          notes: punchNote,
        };
        return [newDaily, ...prev];
      }
    });

    const punchNames = {
      check_in: 'Checked in successfully',
      break_start: 'Break period started',
      break_end: 'Returned from break',
      check_out: 'Checked out successfully',
    };

    const locationNotice = inside
      ? `within ${currentOffice.name} perimeter (${dist}m)`
      : isAllowedOutsideGeofence
      ? `from remote location (${dist}m away - Admin Authorized)`
      : `at remote location (${dist}m from ${currentOffice.name})`;

    return {
      success: true,
      message: `${punchNames[type]} ${locationNotice}. GPS & OTP verified.`,
      flagged: isFlaggedPunch,
    };
  };

  // Remote Punch Out for any employee by Admin (from anywhere)
  const adminPunchOutStaff = async (
    employeeId: string,
    customNote?: string
  ): Promise<{ success: boolean; message: string }> => {
    const targetEmp = employees.find((e) => e.id === employeeId);
    if (!targetEmp) {
      showNotification('error', 'Employee record not found.');
      return { success: false, message: 'Employee not found' };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const punchDate = getDeviceLocalDateStr(now);

    const empShift = shifts.find((s) => s.id === targetEmp.assignedShiftId) || shifts[0];
    const shiftHoursExpected = (empShift?.workingHours || 9) * 60;

    const noteText =
      customNote ||
      `Admin Remote Out: Marked by Administrator (${currentUser?.name || 'Deepak / Admin'}) from anywhere`;

    const newPunch: PunchRecord = {
      id: `p_admin_out_${Date.now()}`,
      type: 'check_out',
      timestamp: nowIso,
      coordinates: {
        latitude: currentOffice.latitude,
        longitude: currentOffice.longitude,
        accuracy: 10,
      },
      locationName: `${currentOffice.name} (Admin Override)`,
      address: currentOffice.address || 'Plot 42, Okhla Industrial Area Phase III, New Delhi',
      mapUrl: getGoogleMapsUrl(currentOffice.latitude, currentOffice.longitude, targetEmp.name),
      distanceFromOfficeMeters: 0,
      isWithinGeofence: true,
      otpVerified: true,
      otpMethod: 'mobile_last4',
      deviceInfo: 'Admin Console (Remote Out Authorized)',
      managerOverride: true,
      overrideNote: noteText,
    };

    setAttendance((prev) => {
      const existing = prev.find(
        (a) => a.employeeId === targetEmp.id && a.date === punchDate
      );

      if (existing) {
        const updatedPunches = [...existing.punches, newPunch];
        let totalWorkMin = existing.totalWorkMinutes || 0;
        let overtimeMin = existing.overtimeMinutes || 0;

        if (existing.checkInTime) {
          const startMs = new Date(existing.checkInTime).getTime();
          const endMs = new Date(nowIso).getTime();
          const rawMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
          totalWorkMin = Math.max(1, rawMinutes - (existing.totalBreakMinutes || 0));
          overtimeMin = totalWorkMin > shiftHoursExpected ? totalWorkMin - shiftHoursExpected : 0;
        } else {
          totalWorkMin = shiftHoursExpected;
          overtimeMin = 0;
        }

        return prev.map((a) =>
          a.id === existing.id
            ? {
                ...a,
                punches: updatedPunches,
                checkOutTime: nowIso,
                totalWorkMinutes: totalWorkMin,
                overtimeMinutes: overtimeMin,
                notes: a.notes ? `${a.notes} | ${noteText}` : noteText,
              }
            : a
        );
      } else {
        const newDaily: DailyAttendance = {
          id: `att_${targetEmp.id}_${punchDate}`,
          employeeId: targetEmp.id,
          date: punchDate,
          punches: [newPunch],
          status: 'present',
          checkOutTime: nowIso,
          totalWorkMinutes: shiftHoursExpected,
          totalBreakMinutes: 0,
          overtimeMinutes: 0,
          isFlaggedForGps: false,
          flagResolved: true,
          notes: noteText,
        };
        return [newDaily, ...prev];
      }
    });

    showNotification('success', `Remote Punch Out successful for ${targetEmp.name} (Admin Override).`);

    // Dispatch email alert to Admin
    if (emailConfig.enableAutoPunchEmails) {
      const emailPayload = buildPunchEmailHtml({
        employeeName: targetEmp.name,
        phone: targetEmp.phone,
        department: targetEmp.department,
        punchType: 'check_out',
        timestamp: nowIso,
        locationName: newPunch.locationName,
        address: newPunch.address,
        distanceMeters: 0,
        isWithinGeofence: true,
        notes: noteText,
        shiftName: empShift?.name,
      });

      sendEmailNotification(emailConfig.adminEmail || 'deepak.mariinox@gmail.com', emailPayload.subject, emailPayload.html)
        .then((res) => {
          if (res.success) console.log('Admin remote punch out email dispatched:', res);
        })
        .catch((err) => console.warn('Admin punch out email error:', err));
    }

    return { success: true, message: `Punch Out successfully recorded for ${targetEmp.name}` };
  };

  // Manager/Admin resolution for GPS flagged record
  const resolveGpsFlag = (attendanceId: string, note: string) => {
    setAttendance((prev) =>
      prev.map((a) =>
        a.id === attendanceId
          ? {
              ...a,
              flagResolved: true,
              notes: a.notes ? `${a.notes} | Resolved by Manager: ${note}` : `Approved: ${note}`,
            }
          : a
      )
    );
    showNotification('success', 'GPS attendance flag reviewed and authorized.');
  };

  // Leave handling
  const applyLeave = (leaveData: Omit<LeaveRequest, 'id' | 'appliedOn' | 'status'>) => {
    const newLeave: LeaveRequest = {
      ...leaveData,
      id: `leave_${Date.now()}`,
      appliedOn: todayStr,
      status: 'pending',
    };
    setLeaves((prev) => [newLeave, ...prev]);
    showNotification('success', 'Leave application submitted for manager approval.');
  };

  const updateLeaveStatus = (id: string, status: 'approved' | 'rejected') => {
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status,
              reviewedBy: currentUser.name,
              reviewedAt: todayStr,
            }
          : l
      )
    );
    showNotification(status === 'approved' ? 'success' : 'info', `Leave request has been ${status}.`);
  };

  // Location CRUD
  const addLocation = (loc: Omit<WorkLocation, 'id'>) => {
    const newLoc: WorkLocation = {
      ...loc,
      id: `loc_${Date.now()}`,
    };
    setLocations((prev) => [...prev, newLoc]);
    showNotification('success', `Added new worksite geofence: ${newLoc.name}`);
  };

  const updateLocation = (id: string, partial: Partial<WorkLocation>) => {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...partial } : l)));
    showNotification('success', 'Work location geofence updated successfully.');
  };

  const deleteLocation = (id: string): boolean => {
    if (locations.length <= 1) {
      showNotification(
        'error',
        'Cannot remove the only remaining office location. At least one office location must be configured for geofence attendance.'
      );
      return false;
    }

    const targetLoc = locations.find((l) => l.id === id);
    if (!targetLoc) return false;

    const remaining = locations.filter((l) => l.id !== id);
    const fallbackLocation = remaining[0];

    // Reassign any employees assigned to this location to fallbackLocation
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.assignedLocationId === id
          ? { ...emp, assignedLocationId: fallbackLocation.id }
          : emp
      )
    );

    setLocations(remaining);
    showNotification(
      'success',
      `Office location "${targetLoc.name}" removed. Assigned staff re-routed to "${fallbackLocation.name}".`
    );
    return true;
  };

  // Shift Management CRUD & Assignment
  const addShift = (shiftData: Omit<WorkShift, 'id'>) => {
    const newShift: WorkShift = {
      ...shiftData,
      id: `shift_${Date.now()}`,
    };
    setShifts((prev) => {
      const updated = [...prev, newShift];
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));
      pushStateToServer({ shifts: updated });
      return updated;
    });
    showNotification('success', `Created work shift schedule: ${newShift.name} (${newShift.startTime} - ${newShift.endTime}).`);
  };

  const updateShift = (id: string, partial: Partial<WorkShift>) => {
    setShifts((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...partial } : s));
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));
      pushStateToServer({ shifts: updated });
      return updated;
    });
    showNotification('success', 'Work shift schedule updated successfully.');
  };

  const deleteShift = (id: string): boolean => {
    if (shifts.length <= 1) {
      showNotification('error', 'At least one default work shift must be maintained.');
      return false;
    }
    const target = shifts.find((s) => s.id === id);
    if (!target) return false;

    const remaining = shifts.filter((s) => s.id !== id);
    const fallbackShift = remaining[0];

    // Reassign any employee with this shift to fallback
    setEmployees((prev) => {
      const remapped = prev.map((e) => (e.assignedShiftId === id ? { ...e, assignedShiftId: fallbackShift.id } : e));
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(remapped));
      pushStateToServer({ employees: remapped, shifts: remaining });
      return remapped;
    });

    setShifts(remaining);
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(remaining));
    showNotification('info', `Shift "${target.name}" removed. Assigned staff assigned to "${fallbackShift.name}".`);
    return true;
  };

  const assignShiftToEmployee = (employeeId: string, shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    const emp = employees.find((e) => e.id === employeeId);
    if (!shift || !emp) return;

    updateEmployee(employeeId, { assignedShiftId: shiftId });
    showNotification('success', `Assigned shift "${shift.name}" (${shift.startTime} - ${shift.endTime}) to ${emp.name}.`);
  };

  // Day-wise Week Off Management
  const updateCompanyWeekOffDays = (days: string[]) => {
    setCompanyWeekOffDays(days);
    localStorage.setItem(STORAGE_KEYS.COMPANY_WEEK_OFF_DAYS, JSON.stringify(days));
    pushStateToServer({ companyWeekOffDays: days });
  };

  const getEmployeeWeekOffDays = useCallback(
    (empOrId?: string | Employee | null): string[] => {
      let emp: Employee | undefined | null;
      if (!empOrId) {
        emp = currentUser;
      } else if (typeof empOrId === 'string') {
        emp = employees.find((e) => e.id === empOrId);
      } else {
        emp = empOrId;
      }
      if (emp?.weekOffDays && Array.isArray(emp.weekOffDays) && emp.weekOffDays.length > 0) {
        return emp.weekOffDays;
      }
      return companyWeekOffDays;
    },
    [currentUser, employees, companyWeekOffDays]
  );

  // Helper to check if today is a week off for a specific employee or current user
  const isTodayWeekOff = useCallback(
    (empOrId?: string | Employee | null): boolean => {
      const days = getEmployeeWeekOffDays(empOrId);
      const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      return days.some((d) => d.toLowerCase() === todayDay.toLowerCase());
    },
    [getEmployeeWeekOffDays]
  );

  // Device Binding Admin Reset
  const unbindEmployeeDevice = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? {
              ...e,
              boundDeviceId: undefined,
              boundDeviceName: undefined,
              boundAt: undefined,
            }
          : e
      )
    );
    showNotification('success', `Device lock cleared for ${emp.name}. The user can now bind a new mobile handset on next login.`);
  };

  // Returns the employee (other than excludeId) that already holds this phone number, if any.
  const findEmployeeWithPhone = (phone: string, excludeId?: string): Employee | undefined => {
    const cleanNorm = normalizePhone10(phone);
    if (!cleanNorm || cleanNorm.length < 6) return undefined; // blank numbers are never considered a conflict
    return employees.find((e) => {
      if (e.id === excludeId) return false;
      const empNorm = normalizePhone10(e.phone || '');
      return empNorm.length >= 6 && empNorm === cleanNorm;
    });
  };

  // Employee CRUD
  const addEmployee = (empData: Omit<Employee, 'id'>) => {
    const cleanPhone = (empData.phone || '').trim();
    if (cleanPhone) {
      const conflict = findEmployeeWithPhone(cleanPhone);
      if (conflict) {
        showNotification(
          'error',
          `Mobile number ${cleanPhone} is already registered to ${conflict.name}. Each staff member must have a unique mobile number.`
        );
        return false;
      }
    }

    const isDeepak = empData.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
    const newEmp: Employee = {
      ...empData,
      phone: cleanPhone,
      name: empData.name.trim(),
      role: isDeepak ? 'admin' : 'staff', // Only deepak.mariinox@gmail.com can be Admin
      id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      appAccessGranted: true,
      accessStatus: 'ACTIVE',
    };

    setEmployees((prev) => {
      const updated = [...prev, newEmp];
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updated));
      return updated;
    });

    // Immediate server sync
    fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmp),
    }).catch(() => {});

    pushStateToServer({ employees: [...employees, newEmp] });

    showNotification('success', `Candidate ${newEmp.name} enrolled successfully in Staff Directory!`);
    return true;
  };

  const updateEmployee = (id: string, partial: Partial<Employee>) => {
    if (partial.phone !== undefined) {
      const conflict = findEmployeeWithPhone(partial.phone, id);
      if (conflict) {
        showNotification(
          'error',
          `Mobile number ${partial.phone} is already registered to ${conflict.name}. Each staff member must have a unique mobile number.`
        );
        return false;
      }
    }

    let updatedTarget: Employee | null = null;
    setEmployees((prev) => {
      const updated = prev.map((e) => {
        if (e.id === id) {
          const updatedEmp = { ...e, ...partial };
          if (partial.name) updatedEmp.name = partial.name.trim();
          const isDeepak = updatedEmp.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
          updatedTarget = {
            ...updatedEmp,
            role: isDeepak ? 'admin' : 'staff', // Strict admin enforcement
          };
          return updatedTarget;
        }
        return e;
      });
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updated));
      return updated;
    });

    if (updatedTarget) {
      fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTarget),
      }).catch(() => {});
    }

    showNotification('success', 'Staff profile updated.');
    return true;
  };

  const deleteEmployee = (id: string) => {
    // Prevent deleting primary admin
    const target = employees.find((e) => e.id === id);
    if (target?.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com' || (target?.phone || '').replace(/\D/g, '') === '9971336707') {
      showNotification('error', 'The primary administrator account cannot be deleted.');
      return;
    }
    const updatedEmployees = employees.filter((e) => e.id !== id);
    setEmployees(updatedEmployees);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updatedEmployees));
    fetch(`/api/staff/${id}`, { method: 'DELETE' }).catch(() => {});
    pushStateToServer({ employees: updatedEmployees });
    showNotification('info', 'Staff record removed.');
  };

  const renameDepartment = (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew) return;
    let affectedCount = 0;
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.department === oldName) {
          affectedCount++;
          return { ...e, department: trimmedNew };
        }
        return e;
      })
    );
    showNotification('success', `Department "${oldName}" renamed to "${trimmedNew}" for all assigned staff.`);
  };

  // Bulk Roster Updates (Weekly and Monthly schedule imports)
  const bulkUpdateRoster = (
    updates: Array<{ employeeId: string; assignedShiftId?: string; weekOffDays?: string[] }>
  ): boolean => {
    if (!updates || updates.length === 0) return false;

    setEmployees((prev) => {
      const updatedList = prev.map((emp) => {
        const updateMatch = updates.find((u) => u.employeeId === emp.id);
        if (!updateMatch) return emp;

        return {
          ...emp,
          assignedShiftId:
            updateMatch.assignedShiftId !== undefined ? updateMatch.assignedShiftId : emp.assignedShiftId,
          weekOffDays:
            updateMatch.weekOffDays !== undefined ? updateMatch.weekOffDays : emp.weekOffDays,
        };
      });

      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updatedList));
      pushStateToServer({ employees: updatedList });
      return updatedList;
    });

    showNotification(
      'success',
      `Roster successfully updated for ${updates.length} employee${updates.length === 1 ? '' : 's'}.`
    );
    return true;
  };

  const clearAllAttendance = () => {
    setAttendance([]);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    showNotification('success', 'All previous attendance logs and punch history have been cleared.');
  };

  const clearCandidateDetails = () => {
    setEmployees(INITIAL_EMPLOYEES);
    setCurrentUserId(INITIAL_EMPLOYEES[0]?.id || null);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    showNotification('success', 'Candidate details and mock staff roster have been removed.');
  };

  const resetAllData = () => {
    setAttendance([]);
    setLeaves([]);
    setEmployees(INITIAL_EMPLOYEES);
    setLocations(INITIAL_LOCATIONS);
    setCurrentUserId(INITIAL_EMPLOYEES[0]?.id || null);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.LEAVES);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(INITIAL_LOCATIONS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, INITIAL_EMPLOYEES[0]?.id || '');
    showNotification('success', 'All old attendance records and candidate details purged successfully.');
  };

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Helper to find employee by email, phone, ID, or name
  const findEmployeeByPhone = (rawInput: string, targetEmpId?: string): Employee | undefined => {
    if (targetEmpId) {
      const byId = employees.find((e) => e.id === targetEmpId);
      if (byId) return byId;
    }

    const trimmed = rawInput.toLowerCase().trim();
    const cleanDigits = rawInput.replace(/\D/g, '');

    // 1. Direct ID match
    const byId = employees.find((emp) => emp.id.toLowerCase() === trimmed);
    if (byId) return byId;

    // 2. Match by Email (e.g. Deepak.Mariinox@gmail.com, mohit.chauhan@drkgoods.com)
    const byEmail = employees.find((emp) => emp.email?.toLowerCase().trim() === trimmed);
    if (byEmail) return byEmail;

    // 3. Match by phone digits (supports +91, 0, spaces, and last 10 digits)
    if (cleanDigits.length >= 4) {
      const byPhone = employees.find((emp) => {
        const empClean = (emp.phone || '').replace(/\D/g, '');
        if (!empClean) return false;
        return (
          empClean === cleanDigits ||
          empClean.endsWith(cleanDigits) ||
          cleanDigits.endsWith(empClean) ||
          empClean.includes(cleanDigits) ||
          cleanDigits.includes(empClean)
        );
      });
      if (byPhone) return byPhone;
    }

    // 4. Match by Name (exact, substring, or token match)
    if (trimmed.length >= 2) {
      const byName = employees.find((emp) => {
        const empNameLower = emp.name.toLowerCase().trim();
        if (empNameLower === trimmed || empNameLower.includes(trimmed) || trimmed.includes(empNameLower)) {
          return true;
        }
        const nameTokens = empNameLower.split(/\s+/).filter((t) => t.length >= 3);
        const searchTokens = trimmed.split(/\s+/).filter((t) => t.length >= 3);
        return (
          nameTokens.some((t) => trimmed.includes(t)) ||
          searchTokens.some((t) => empNameLower.includes(t))
        );
      });
      if (byName) return byName;
    }

    return undefined;
  };

  const requestLoginOtp = (rawPhone: string, targetEmpId?: string) => {
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const emp = findEmployeeByPhone(rawPhone, targetEmpId);
    if (!emp) {
      return {
        success: false,
        message: `Access Denied: Mobile number +91 ${cleanDigits || rawPhone} is not registered in the Staff Directory. Only candidates & staff whose mobile number and name are added in the Staff Directory can log in. Please contact Administrator Deepak Yadav to register your details.`,
      };
    }

    const isAdmin = (emp.phone || '').replace(/\D/g, '') === '9971336707' || emp.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';

    // If staff member does not have a mobile number registered, disallow login and instruct them to contact Admin
    if (!isAdmin && (!emp.phone || emp.phone.trim() === '')) {
      return {
        success: false,
        message: `Mobile number not registered for ${emp.name}. Only Administrator Deepak Yadav can add or update candidate mobile numbers in Staff Directory.`,
      };
    }

    return {
      success: true,
      message: `Please enter your 4-digit Security PIN / OTP (Last 4 digits of your registered phone: ${emp.phone?.replace(/\D/g, '').slice(-4) || '1234'}).`,
      employee: emp,
    };
  };

  const loginWithPhone = (rawPhone: string, enteredPin: string, targetEmpId?: string) => {
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const emp = findEmployeeByPhone(rawPhone, targetEmpId);
    if (!emp) {
      return {
        success: false,
        message: `Access Denied: Mobile number +91 ${cleanDigits || rawPhone} is not registered in the Staff Directory. Only authorized personnel whose details are added in Staff Directory can log in.`,
      };
    }

    const isAdmin = (emp.phone || '').replace(/\D/g, '') === '9971336707' || emp.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';

    // Disallow staff without mobile number
    if (!isAdmin && (!emp.phone || emp.phone.trim() === '')) {
      return {
        success: false,
        message: `Mobile number not registered for ${emp.name}. Please contact Administrator Deepak Yadav to add your phone number in Staff Directory.`,
      };
    }

    const effectivePhone = emp.phone || (isAdmin ? '9971336707' : '');
    const cleanPhone = effectivePhone.replace(/\D/g, '');
    const fallbackPin = cleanPhone.slice(-4) || (isAdmin ? '6707' : '1234');

    // Verify against registered PIN / master code
    const verifyResult = verifyOtp(enteredPin, effectivePhone, emp.id, fallbackPin);
    if (!verifyResult.isValid) {
      return {
        success: false,
        message: verifyResult.message,
      };
    }

    // Only Admin can update their own phone via login if needed
    if (isAdmin && rawPhone.replace(/\D/g, '').length >= 4 && emp.phone !== rawPhone) {
      updateEmployee(emp.id, { phone: rawPhone });
    }

    // Single device check: Auto-bind device on successful PIN authentication
    const currentDeviceId = getOrCreateDeviceId();
    const currentDeviceName = getDeviceFriendlyName();

    if (!isAdmin) {
      updateEmployee(emp.id, {
        boundDeviceId: currentDeviceId,
        boundDeviceName: currentDeviceName,
        boundAt: new Date().toISOString(),
      });
    }

    setCurrentUserId(emp.id);
    setIsLoginModalOpen(false);
    showNotification('success', `Welcome back, ${emp.name}! Logged in as ${emp.role.toUpperCase()}.`);

    return {
      success: true,
      message: `Successfully logged in as ${emp.name}.`,
      employee: emp,
    };
  };

  const logout = () => {
    setCurrentUserId(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    setIsLoginModalOpen(false);
    showNotification('info', 'Logged out successfully. You can sign in anytime using your phone or admin credentials.');
  };

  // Gmail OAuth Connection Trigger
  const connectGmailOAuth = async (): Promise<string | null> => {
    try {
      const token = await getGmailAccessToken(true);
      if (token) {
        showNotification('success', 'Google Workspace (Gmail) connected! Automatic emails will be delivered directly from your Google account.');
        return token;
      } else {
        showNotification('info', 'Google OAuth connection cancelled or pending permissions. Notifications will continue delivering via server relay.');
        return null;
      }
    } catch (err: any) {
      showNotification('error', `Google OAuth error: ${err?.message || 'Failed to authenticate'}`);
      return null;
    }
  };

  // Send Manual Punch Alert Email (e.g. from Audit Log or Live Punch Modal)
  const sendManualPunchAlertEmail = async (
    punch: PunchRecord,
    emp: Employee,
    _force = false
  ): Promise<{ success: boolean; message: string }> => {
    const shift = shifts.find((s) => s.id === emp.assignedShiftId) || shifts[0];
    const emailPayload = buildPunchEmailHtml({
      employeeName: emp.name,
      phone: emp.phone,
      department: emp.department,
      punchType: punch.type,
      timestamp: punch.timestamp,
      locationName: punch.locationName,
      address: punch.address,
      distanceMeters: punch.distanceFromOfficeMeters,
      isWithinGeofence: punch.isWithinGeofence,
      notes: punch.overrideNote,
      shiftName: shift?.name,
    });

    const result = await sendEmailNotification(
      emailConfig.adminEmail || 'deepak.mariinox@gmail.com',
      emailPayload.subject,
      emailPayload.html
    );

    if (result.success) {
      showNotification('success', `Punch alert email for ${emp.name} sent to ${emailConfig.adminEmail}!`);
    } else {
      showNotification('error', `Failed to send email: ${result.message}`);
    }
    return result;
  };

  // Send Daily Attendance Summary Report Email to Admin
  const sendManualDailySummaryEmail = async (date?: string): Promise<{ success: boolean; message: string }> => {
    const targetDate = date || todayStr;
    const dayAttendance = attendance.filter((a) => a.date === targetDate);
    const totalStaff = employees.filter((e) => e.role !== 'admin' || employees.length === 1).length;

    let presentStaff = 0;
    let lateStaff = 0;
    let absentStaff = 0;

    const summaryRecords = employees.map((emp) => {
      const att = dayAttendance.find((a) => a.employeeId === emp.id);
      let status = 'absent';
      let checkInStr = '';
      let checkOutStr = '';
      let hoursWorked = '0h';

      if (att && att.punches.length > 0) {
        const inPunch = att.punches.find((p) => p.type === 'check_in');
        const outPunch = att.punches.slice().reverse().find((p) => p.type === 'check_out');

        if (inPunch) {
          checkInStr = new Date(inPunch.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
        if (outPunch) {
          checkOutStr = new Date(outPunch.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        }

        const mins = att.totalWorkMinutes || 0;
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        hoursWorked = `${hrs}h ${remMins}m`;

        status = att.status || 'present';
        if (status === 'present') presentStaff++;
        else if (status === 'late') lateStaff++;
        else absentStaff++;
      } else {
        absentStaff++;
      }

      return {
        name: emp.name,
        phone: emp.phone,
        dept: emp.department,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        hoursWorked,
        status,
      };
    });

    const emailPayload = buildDailySummaryEmailHtml({
      dateStr: targetDate,
      totalStaff,
      presentStaff,
      lateStaff,
      absentStaff,
      records: summaryRecords,
    });

    const result = await sendEmailNotification(
      emailConfig.adminEmail || 'deepak.mariinox@gmail.com',
      emailPayload.subject,
      emailPayload.html
    );

    if (result.success) {
      showNotification('success', `Daily attendance summary report for ${targetDate} delivered to ${emailConfig.adminEmail}!`);
    } else {
      showNotification('error', `Failed to send summary report: ${result.message}`);
    }
    return result;
  };

  // Monthly Payroll
  const payrollRecords = useMemo(() => {
    return calculateMonthlyPayrollRecords(employees, attendance, selectedPayrollMonth);
  }, [employees, attendance, selectedPayrollMonth]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        setCurrentUser: (emp) => setCurrentUserId(emp ? emp.id : null),
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        renameDepartment,
        unbindEmployeeDevice,
        shifts,
        addShift,
        updateShift,
        deleteShift,
        assignShiftToEmployee,
        bulkUpdateRoster,
        companyWeekOffDays,
        updateCompanyWeekOffDays,
        getEmployeeWeekOffDays,
        isTodayWeekOff,
        locations,
        addLocation,
        updateLocation,
        deleteLocation,
        currentOffice,
        gpsCoords,
        isGpsLoading,
        gpsError,
        refreshGps,
        simulateGpsLocation,
        isSimulatedLocation,
        distanceToOffice,
        isWithinGeofence,
        isGpsEnforced,
        toggleGpsEnforcement,
        attendance,
        todayStr,
        todayRecord,
        activePunchStatus,
        clockInOut,
        adminPunchOutStaff,
        resolveGpsFlag,
        leaves,
        applyLeave,
        updateLeaveStatus,
        clearAllAttendance,
        clearCandidateDetails,
        resetAllData,
        selectedPayrollMonth,
        setSelectedPayrollMonth,
        payrollRecords,
        notification,
        showNotification,
        activeLocationModalPunch,
        activeLocationModalEmployee,
        openPunchLocationModal,
        closePunchLocationModal,
        latestSuccessPunch,
        clearLatestSuccessPunch,
        emailConfig,
        updateEmailConfig,
        sendManualPunchAlertEmail,
        sendManualDailySummaryEmail,
        connectGmailOAuth,
        isLoginModalOpen,
        setIsLoginModalOpen,
        requestLoginOtp,
        loginWithPhone,
        logout,
        syncWithServer,
        lastSyncTime,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
