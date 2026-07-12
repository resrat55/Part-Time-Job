export type UserRole = 'employee' | 'hr';

export interface EmployeeProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  hourlyRate: number; // Regular hourly rate
  designation: string;
  joinedDate: string;
  createdAt: string;
}

export type ShiftType = 'day' | 'night';
export type RecordStatus = 'pending' | 'approved' | 'rejected';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  hoursWorked: number;
  shiftType: ShiftType;
  status: RecordStatus;
  hourlyRateApplied: number;
  bonusApplied: number; // Flat bonus like 100 taka for night shift
  earnedAmount: number;
  payPeriod: string; // YYYY-MM
  createdAt: string;
}

export interface AdvanceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  reason: string;
  status: RecordStatus;
  payPeriod: string; // YYYY-MM
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

export interface SystemConfig {
  defaultHourlyRate: number;
  nightShiftBasicRate: number;
  nightShiftAllowance: number;
  currentPayPeriod: string; // YYYY-MM
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

