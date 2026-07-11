import {
  EmployeeProfile,
  AttendanceRecord,
  AdvanceRequest,
  SystemConfig,
  RecordStatus
} from './types';

// We always run in local offline mode now as requested by the user
export function isLocalMode(): boolean {
  return true;
}

function getLocalUsers(): (EmployeeProfile & { password?: string })[] {
  const data = localStorage.getItem('attendance_local_users');
  return data ? JSON.parse(data) : [];
}

function saveLocalUsers(users: (EmployeeProfile & { password?: string })[]) {
  localStorage.setItem('attendance_local_users', JSON.stringify(users));
}

function getLocalAttendance(): AttendanceRecord[] {
  const data = localStorage.getItem('attendance_local_attendance');
  return data ? JSON.parse(data) : [];
}

function saveLocalAttendance(records: AttendanceRecord[]) {
  localStorage.setItem('attendance_local_attendance', JSON.stringify(records));
}

function getLocalAdvances(): AdvanceRequest[] {
  const data = localStorage.getItem('attendance_local_advances');
  return data ? JSON.parse(data) : [];
}

function saveLocalAdvances(reqs: AdvanceRequest[]) {
  localStorage.setItem('attendance_local_advances', JSON.stringify(reqs));
}

// Seed mock accounts for demonstrating the app features instantly
export function seedDefaultDemoUsers(): void {
  // Empty to ensure zero pre-seeded data as per user request
}

// Ensure standard configuration exists
export async function ensureSystemConfig(): Promise<SystemConfig> {
  const saved = localStorage.getItem('attendance_local_config');
  if (saved) {
    return JSON.parse(saved) as SystemConfig;
  }
  const defaultConfig: SystemConfig = {
    defaultHourlyRate: 200, // default rate in Taka
    nightShiftBasicRate: 70, // per hour basic night shift rate
    nightShiftAllowance: 100, // extra night shift allowance per shift
    currentPayPeriod: new Date().toISOString().substring(0, 7), // "YYYY-MM"
  };
  localStorage.setItem('attendance_local_config', JSON.stringify(defaultConfig));
  return defaultConfig;
}

export async function getSystemConfig(): Promise<SystemConfig> {
  return ensureSystemConfig();
}

export async function updateSystemConfig(config: Partial<SystemConfig>): Promise<void> {
  const current = await getSystemConfig();
  const updated = { ...current, ...config };
  localStorage.setItem('attendance_local_config', JSON.stringify(updated));
}

// User Profiles
export async function getEmployeeProfile(uid: string): Promise<EmployeeProfile | null> {
  const users = getLocalUsers();
  const found = users.find((u) => u.uid === uid);
  if (!found) return null;
  
  // Exclude password from return
  const { password, ...profile } = found;
  return profile;
}

export async function saveEmployeeProfile(profile: EmployeeProfile & { password?: string }): Promise<void> {
  const users = getLocalUsers();
  const index = users.findIndex((u) => u.uid === profile.uid);
  if (index >= 0) {
    users[index] = { ...users[index], ...profile };
  } else {
    users.push(profile);
  }
  saveLocalUsers(users);
}

export async function getAllEmployees(): Promise<EmployeeProfile[]> {
  const users = getLocalUsers();
  return users
    .filter((u) => u.role === 'employee')
    .map(({ password, ...u }) => u);
}

export async function updateEmployeeRate(uid: string, newRate: number): Promise<void> {
  const users = getLocalUsers();
  const index = users.findIndex((u) => u.uid === uid);
  if (index >= 0) {
    users[index].hourlyRate = newRate;
    saveLocalUsers(users);
  }
}

// Attendance Records
export async function addAttendanceRecord(record: Omit<AttendanceRecord, 'id'>): Promise<string> {
  const records = getLocalAttendance();
  const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const fullRecord: AttendanceRecord = { ...record, id };
  records.push(fullRecord);
  saveLocalAttendance(records);
  return id;
}

export async function getEmployeeAttendance(employeeId: string, payPeriod: string): Promise<AttendanceRecord[]> {
  const records = getLocalAttendance();
  return records
    .filter((r) => r.employeeId === employeeId && r.payPeriod === payPeriod)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getAllAttendance(payPeriod: string): Promise<AttendanceRecord[]> {
  const records = getLocalAttendance();
  return records
    .filter((r) => r.payPeriod === payPeriod)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function updateAttendanceRecordStatus(id: string, status: RecordStatus): Promise<void> {
  const records = getLocalAttendance();
  const index = records.findIndex((r) => r.id === id);
  if (index >= 0) {
    records[index].status = status;
    saveLocalAttendance(records);
  }
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  const records = getLocalAttendance();
  const filtered = records.filter((r) => r.id !== id);
  saveLocalAttendance(filtered);
}

// Advance Requests
export async function submitAdvanceRequest(request: Omit<AdvanceRequest, 'id'>): Promise<string> {
  const reqs = getLocalAdvances();
  const id = `adv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  // Set to approved by default since it is a self-managed offline registry
  const fullReq: AdvanceRequest = { ...request, id, status: 'approved', processedBy: 'Self-Approved' };
  reqs.push(fullReq);
  saveLocalAdvances(reqs);
  return id;
}

export async function deleteAdvanceRequest(id: string): Promise<void> {
  const reqs = getLocalAdvances();
  const filtered = reqs.filter((r) => r.id !== id);
  saveLocalAdvances(filtered);
}

export async function getEmployeeAdvanceRequests(employeeId: string, payPeriod: string): Promise<AdvanceRequest[]> {
  const reqs = getLocalAdvances();
  return reqs
    .filter((r) => r.employeeId === employeeId && r.payPeriod === payPeriod)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export async function getAllAdvanceRequests(payPeriod: string): Promise<AdvanceRequest[]> {
  const reqs = getLocalAdvances();
  return reqs
    .filter((r) => r.payPeriod === payPeriod)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export async function updateAdvanceRequestStatus(
  id: string,
  status: RecordStatus,
  hrUid: string,
  hrName: string,
  rejectionReason?: string
): Promise<void> {
  const reqs = getLocalAdvances();
  const index = reqs.findIndex((r) => r.id === id);
  if (index >= 0) {
    reqs[index].status = status;
    reqs[index].processedAt = new Date().toISOString();
    reqs[index].processedBy = hrName;
    if (rejectionReason) {
      reqs[index].rejectionReason = rejectionReason;
    }
    saveLocalAdvances(reqs);
  }
}

// Local Mock Authentication functions
export async function localSignIn(email: string, passwordInput: string): Promise<EmployeeProfile> {
  await ensureSystemConfig();
  const users = getLocalUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
  
  if (!user) {
    throw new Error('User not found. Please sign up or click one of the demo logins below.');
  }
  
  if (user.password !== passwordInput) {
    throw new Error('Invalid credentials. If using demo accounts, the default password is "password123".');
  }

  // Set active local session
  const sessionUser = {
    uid: user.uid,
    email: user.email,
    displayName: user.name,
  };
  localStorage.setItem('attendance_local_mode', 'true');
  localStorage.setItem('attendance_local_user', JSON.stringify(sessionUser));

  const { password, ...profile } = user;
  return profile;
}

export async function localSignUp(
  email: string,
  passwordInput: string,
  name: string,
  role: 'employee' | 'hr',
  designation: string,
  rate: number
): Promise<EmployeeProfile> {
  await ensureSystemConfig();
  const users = getLocalUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Email already registered locally. Please sign in instead.');
  }

  const uid = `local_${role}_${Date.now()}`;
  const profile: EmployeeProfile & { password?: string } = {
    uid,
    email: normalizedEmail,
    password: passwordInput,
    name: name.trim(),
    role,
    hourlyRate: role === 'hr' ? 0 : rate,
    designation: role === 'hr' ? 'HR / Manager' : (designation.trim() || 'Staff'),
    joinedDate: new Date().toISOString().substring(0, 10),
    createdAt: new Date().toISOString(),
  };

  users.push(profile);
  saveLocalUsers(users);

  // Set active local session
  const sessionUser = {
    uid,
    email: profile.email,
    displayName: profile.name,
  };
  localStorage.setItem('attendance_local_mode', 'true');
  localStorage.setItem('attendance_local_user', JSON.stringify(sessionUser));

  const { password, ...resultProfile } = profile;
  return resultProfile;
}

// Seed mock data for demonstrating the app features instantly
export async function seedDemoDataForEmployee(employeeUid: string, employeeName: string, payPeriod: string, hourlyRate: number): Promise<void> {
  // Empty to ensure zero data as requested
}
