export type UserRole = 'admin' | 'manager' | 'staff';

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'on_leave';
export type PunchType = 'check_in' | 'break_start' | 'break_end' | 'check_out';

export interface WorkLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // e.g. 150m geofence
  isDefault?: boolean;
}

export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface WorkShift {
  id: string;
  name: string; // e.g. "Morning Shift (07:00 AM - 04:00 PM)", "General Shift (09:30 AM - 06:30 PM)"
  startTime: string; // "07:00"
  endTime: string; // "16:00"
  graceMinutes: number; // e.g. 15
  gracePeriodMinutes?: number; // legacy alias
  workingHours: number; // e.g. 9
  description?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string; // e.g. "+91 98765 43210"
  role: UserRole;
  department: string;
  designation: string;
  vendor?: string; // Vendor / Contractor / Direct
  avatarUrl?: string;
  assignedLocationId: string;
  assignedShiftId?: string; // Assigned Shift ID
  weekOffDays?: string[]; // Day-wise Week Off (e.g. ['Sunday'] or ['Saturday', 'Sunday']). If unset, inherits organization week off.
  yearlySalary?: number; // Yearly CTC / Annual Salary in INR (₹)
  monthlyBaseSalary: number; // Monthly Base
  hourlyRate?: number;
  overtimeRateMultiplier: number;
  bankAccount: string;
  joinDate: string;
  // App Access & Login Permissions
  appAccessGranted?: boolean; // Default true - Allows instant login & punch clock
  customPin?: string; // Optional custom 4-digit login PIN
  accessStatus?: 'ACTIVE' | 'REVOKED'; // Access status
  // Single Phone / Single Device Lock
  boundDeviceId?: string;
  boundDeviceName?: string;
  boundAt?: string;
}

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface PunchRecord {
  id: string;
  type: PunchType;
  timestamp: string; // ISO string
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  locationName: string;
  address?: string;
  mapUrl?: string;
  distanceFromOfficeMeters: number;
  isWithinGeofence: boolean;
  otpVerified: boolean;
  otpMethod: 'mobile_last4' | 'sms_otp';
  deviceInfo?: string;
  managerOverride?: boolean;
  overrideNote?: string;
}

export interface DailyAttendance {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  punches: PunchRecord[];
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  overtimeMinutes: number;
  isFlaggedForGps: boolean; // Flagged if checked in out-of-bounds
  flagResolved: boolean;
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'sick' | 'casual' | 'annual' | 'unpaid';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedOn: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
}

export interface PayrollRecord {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  department: string;
  phone: string;
  month: string; // YYYY-MM
  yearlySalary?: number; // Yearly CTC (₹)
  baseSalary: number; // Monthly Base (₹15,000 for standard ₹1,800 PF)
  pfDeduction?: number; // Statutory EPF Deduction (₹1,800)
  workingDaysExpected: number;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  regularPay: number;
  overtimePay: number;
  bonuses: number;
  deductions: number; // Late arrival or absence penalties
  taxWithheld: number;
  netPay: number;
  paymentStatus: 'pending' | 'processed' | 'paid';
  generatedAt: string;
}

export interface EmailNotificationLog {
  id: string;
  to: string;
  subject: string;
  timestamp: string;
  status: 'delivered_gmail' | 'dispatched_server' | 'failed';
  method: 'gmail_api' | 'system_relay';
  note?: string;
}

export interface SystemSettings {
  geofenceRadiusMeters: number;
  autoCheckoutHours: number;
  isGpsEnforced: boolean;
  overtimeThresholdHours: number;
  requireOtpForPunches: boolean;
  allowSelfieCapture: boolean;
  singlePhoneDeviceLock: boolean;
  enableOfflineSync: boolean;
  gracePeriodMinutes: number;
  companyName: string;
  smsGatewayStatus: string;
  isAppLockedDown: boolean;
  adminNotificationEmail?: string;
  enableAutoPunchEmails?: boolean;
  enableDailySummaryEmails?: boolean;
}
