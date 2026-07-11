import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import {
  EmployeeProfile,
  AttendanceRecord,
  AdvanceRequest,
  SystemConfig,
  RecordStatus
} from './types';

const CONFIG_DOC_ID = 'global';

export function isLocalMode(): boolean {
  return localStorage.getItem('attendance_local_mode') === 'true';
}

function getLocalUsers(): EmployeeProfile[] {
  const data = localStorage.getItem('attendance_local_users');
  return data ? JSON.parse(data) : [];
}

function saveLocalUsers(users: EmployeeProfile[]) {
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

// Ensure standard configuration exists
export async function ensureSystemConfig(): Promise<SystemConfig> {
  if (isLocalMode()) {
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

  try {
    const configRef = doc(db, 'system_config', CONFIG_DOC_ID);
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      return configSnap.data() as SystemConfig;
    }

    const defaultConfig: SystemConfig = {
      defaultHourlyRate: 200, // default rate in Taka
      nightShiftBasicRate: 70, // per hour basic night shift rate
      nightShiftAllowance: 100, // extra night shift allowance per shift
      currentPayPeriod: new Date().toISOString().substring(0, 7), // "YYYY-MM"
    };

    await setDoc(configRef, defaultConfig);
    return defaultConfig;
  } catch (err: any) {
    const isOffline = err.message?.toLowerCase().includes('offline') || 
                      err.message?.toLowerCase().includes('could not reach') || 
                      err.message?.toLowerCase().includes('failed to get document') ||
                      err.code === 'unavailable';
    if (isOffline) {
      console.warn('Firestore is offline inside ensureSystemConfig. Activating Local Mode.');
      localStorage.setItem('attendance_local_mode', 'true');
      return ensureSystemConfig();
    }
    throw err;
  }
}

export async function getSystemConfig(): Promise<SystemConfig> {
  if (isLocalMode()) {
    const saved = localStorage.getItem('attendance_local_config');
    if (saved) {
      return JSON.parse(saved) as SystemConfig;
    }
    return ensureSystemConfig();
  }

  try {
    const configRef = doc(db, 'system_config', CONFIG_DOC_ID);
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      return configSnap.data() as SystemConfig;
    }
    return ensureSystemConfig();
  } catch (err: any) {
    const isOffline = err.message?.toLowerCase().includes('offline') || 
                      err.message?.toLowerCase().includes('could not reach') || 
                      err.message?.toLowerCase().includes('failed to get document') ||
                      err.code === 'unavailable';
    if (isOffline) {
      console.warn('Firestore is offline inside getSystemConfig. Activating Local Mode.');
      localStorage.setItem('attendance_local_mode', 'true');
      return getSystemConfig();
    }
    throw err;
  }
}

export async function updateSystemConfig(config: Partial<SystemConfig>): Promise<void> {
  if (isLocalMode()) {
    const current = await getSystemConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('attendance_local_config', JSON.stringify(updated));
    return;
  }

  const configRef = doc(db, 'system_config', CONFIG_DOC_ID);
  await updateDoc(configRef, config);
}

// User Profiles
export async function getEmployeeProfile(uid: string): Promise<EmployeeProfile | null> {
  if (isLocalMode()) {
    const users = getLocalUsers();
    return users.find((u) => u.uid === uid) || null;
  }

  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as EmployeeProfile;
    }
    return null;
  } catch (err: any) {
    const isOffline = err.message?.toLowerCase().includes('offline') || 
                      err.message?.toLowerCase().includes('could not reach') || 
                      err.message?.toLowerCase().includes('failed to get document') ||
                      err.code === 'unavailable';
    if (isOffline) {
      console.warn('Firestore is offline inside getEmployeeProfile. Activating Local Mode.');
      localStorage.setItem('attendance_local_mode', 'true');
      return getEmployeeProfile(uid);
    }
    throw err;
  }
}

export async function saveEmployeeProfile(profile: EmployeeProfile): Promise<void> {
  if (isLocalMode()) {
    const users = getLocalUsers();
    const index = users.findIndex((u) => u.uid === profile.uid);
    if (index >= 0) {
      users[index] = profile;
    } else {
      users.push(profile);
    }
    saveLocalUsers(users);
    return;
  }

  const userRef = doc(db, 'users', profile.uid);
  await setDoc(userRef, profile);
}

export async function getAllEmployees(): Promise<EmployeeProfile[]> {
  if (isLocalMode()) {
    const users = getLocalUsers();
    return users.filter((u) => u.role === 'employee');
  }

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'employee'));
  const snap = await getDocs(q);
  const employees: EmployeeProfile[] = [];
  snap.forEach((doc) => {
    employees.push(doc.data() as EmployeeProfile);
  });
  return employees;
}

export async function updateEmployeeRate(uid: string, newRate: number): Promise<void> {
  if (isLocalMode()) {
    const users = getLocalUsers();
    const index = users.findIndex((u) => u.uid === uid);
    if (index >= 0) {
      users[index].hourlyRate = newRate;
      saveLocalUsers(users);
    }
    return;
  }

  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { hourlyRate: newRate });
}

// Attendance Records
export async function addAttendanceRecord(record: Omit<AttendanceRecord, 'id'>): Promise<string> {
  if (isLocalMode()) {
    const records = getLocalAttendance();
    const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const fullRecord: AttendanceRecord = { ...record, id };
    records.push(fullRecord);
    saveLocalAttendance(records);
    return id;
  }

  const attendanceRef = collection(db, 'attendance');
  const docRef = await addDoc(attendanceRef, record);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function getEmployeeAttendance(employeeId: string, payPeriod: string): Promise<AttendanceRecord[]> {
  if (isLocalMode()) {
    const records = getLocalAttendance();
    return records
      .filter((r) => r.employeeId === employeeId && r.payPeriod === payPeriod)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  const attendanceRef = collection(db, 'attendance');
  const q = query(
    attendanceRef,
    where('employeeId', '==', employeeId),
    where('payPeriod', '==', payPeriod),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  const records: AttendanceRecord[] = [];
  snap.forEach((doc) => {
    records.push(doc.data() as AttendanceRecord);
  });
  return records;
}

export async function getAllAttendance(payPeriod: string): Promise<AttendanceRecord[]> {
  if (isLocalMode()) {
    const records = getLocalAttendance();
    return records
      .filter((r) => r.payPeriod === payPeriod)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  const attendanceRef = collection(db, 'attendance');
  const q = query(
    attendanceRef,
    where('payPeriod', '==', payPeriod),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  const records: AttendanceRecord[] = [];
  snap.forEach((doc) => {
    records.push(doc.data() as AttendanceRecord);
  });
  return records;
}

export async function updateAttendanceRecordStatus(id: string, status: RecordStatus): Promise<void> {
  if (isLocalMode()) {
    const records = getLocalAttendance();
    const index = records.findIndex((r) => r.id === id);
    if (index >= 0) {
      records[index].status = status;
      saveLocalAttendance(records);
    }
    return;
  }

  const docRef = doc(db, 'attendance', id);
  await updateDoc(docRef, { status });
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  if (isLocalMode()) {
    const records = getLocalAttendance();
    const filtered = records.filter((r) => r.id !== id);
    saveLocalAttendance(filtered);
    return;
  }

  const docRef = doc(db, 'attendance', id);
  await deleteDoc(docRef);
}

// Advance Requests
export async function submitAdvanceRequest(request: Omit<AdvanceRequest, 'id'>): Promise<string> {
  if (isLocalMode()) {
    const reqs = getLocalAdvances();
    const id = `adv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const fullReq: AdvanceRequest = { ...request, id };
    reqs.push(fullReq);
    saveLocalAdvances(reqs);
    return id;
  }

  const requestsRef = collection(db, 'advance_requests');
  const docRef = await addDoc(requestsRef, request);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function getEmployeeAdvanceRequests(employeeId: string, payPeriod: string): Promise<AdvanceRequest[]> {
  if (isLocalMode()) {
    const reqs = getLocalAdvances();
    return reqs
      .filter((r) => r.employeeId === employeeId && r.payPeriod === payPeriod)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  const requestsRef = collection(db, 'advance_requests');
  const q = query(
    requestsRef,
    where('employeeId', '==', employeeId),
    where('payPeriod', '==', payPeriod),
    orderBy('requestedAt', 'desc')
  );
  const snap = await getDocs(q);
  const requests: AdvanceRequest[] = [];
  snap.forEach((doc) => {
    requests.push(doc.data() as AdvanceRequest);
  });
  return requests;
}

export async function getAllAdvanceRequests(payPeriod: string): Promise<AdvanceRequest[]> {
  if (isLocalMode()) {
    const reqs = getLocalAdvances();
    return reqs
      .filter((r) => r.payPeriod === payPeriod)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  const requestsRef = collection(db, 'advance_requests');
  const q = query(
    requestsRef,
    where('payPeriod', '==', payPeriod),
    orderBy('requestedAt', 'desc')
  );
  const snap = await getDocs(q);
  const requests: AdvanceRequest[] = [];
  snap.forEach((doc) => {
    requests.push(doc.data() as AdvanceRequest);
  });
  return requests;
}

export async function updateAdvanceRequestStatus(
  id: string,
  status: RecordStatus,
  hrUid: string,
  hrName: string,
  rejectionReason?: string
): Promise<void> {
  if (isLocalMode()) {
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
    return;
  }

  const docRef = doc(db, 'advance_requests', id);
  const updates: Partial<AdvanceRequest> = {
    status,
    processedAt: new Date().toISOString(),
    processedBy: hrName,
  };
  if (rejectionReason) {
    updates.rejectionReason = rejectionReason;
  }
  await updateDoc(docRef, updates);
}

// Seed mock data for demonstrating the app features instantly
export async function seedDemoDataForEmployee(employeeUid: string, employeeName: string, payPeriod: string, hourlyRate: number): Promise<void> {
  if (isLocalMode()) {
    const records = getLocalAttendance();
    const existing = records.filter(r => r.employeeId === employeeUid && r.payPeriod === payPeriod);
    if (existing.length > 0) return;
  } else {
    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef, where('employeeId', '==', employeeUid), where('payPeriod', '==', payPeriod));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return; // Already has records, don't double-seed
    }
  }

  // Create standard year/month prefix
  const yearMonth = payPeriod; // e.g., "2026-07"
  
  // Seed sample attendance
  const sampleRecords: Omit<AttendanceRecord, 'id'>[] = [
    {
      employeeId: employeeUid,
      employeeName,
      date: `${yearMonth}-01`,
      startTime: '09:00',
      endTime: '17:00',
      hoursWorked: 8,
      shiftType: 'day',
      status: 'approved',
      hourlyRateApplied: hourlyRate,
      bonusApplied: 0,
      earnedAmount: 8 * hourlyRate,
      payPeriod: yearMonth,
      createdAt: new Date(`${yearMonth}-01T17:00:00Z`).toISOString()
    },
    {
      employeeId: employeeUid,
      employeeName,
      date: `${yearMonth}-02`,
      startTime: '09:00',
      endTime: '18:00',
      hoursWorked: 9,
      shiftType: 'day',
      status: 'approved',
      hourlyRateApplied: hourlyRate,
      bonusApplied: 0,
      earnedAmount: 9 * hourlyRate,
      payPeriod: yearMonth,
      createdAt: new Date(`${yearMonth}-02T18:00:00Z`).toISOString()
    },
    {
      employeeId: employeeUid,
      employeeName,
      date: `${yearMonth}-03`,
      startTime: '21:00',
      endTime: '03:00', // 6 hours night shift
      hoursWorked: 6,
      shiftType: 'night',
      status: 'approved',
      hourlyRateApplied: 70, // Basic night hourly rate
      bonusApplied: 100, // Night allowance
      earnedAmount: 6 * 70 + 100, // 520
      payPeriod: yearMonth,
      createdAt: new Date(`${yearMonth}-04T03:00:00Z`).toISOString()
    },
    {
      employeeId: employeeUid,
      employeeName,
      date: `${yearMonth}-04`,
      startTime: '09:00',
      endTime: '17:00',
      hoursWorked: 8,
      shiftType: 'day',
      status: 'approved',
      hourlyRateApplied: hourlyRate,
      bonusApplied: 0,
      earnedAmount: 8 * hourlyRate,
      payPeriod: yearMonth,
      createdAt: new Date(`${yearMonth}-04T17:00:00Z`).toISOString()
    },
    {
      employeeId: employeeUid,
      employeeName,
      date: `${yearMonth}-05`,
      startTime: '22:00',
      endTime: '06:00', // 8 hours night shift
      hoursWorked: 8,
      shiftType: 'night',
      status: 'pending', // Pending HR approval to demonstrate workflow
      hourlyRateApplied: 70,
      bonusApplied: 100,
      earnedAmount: 8 * 70 + 100, // 660
      payPeriod: yearMonth,
      createdAt: new Date(`${yearMonth}-06T06:00:00Z`).toISOString()
    }
  ];

  for (const record of sampleRecords) {
    await addAttendanceRecord(record);
  }

  // Seed sample advances
  const sampleAdvances: Omit<AdvanceRequest, 'id'>[] = [
    {
      employeeId: employeeUid,
      employeeName,
      amount: 1500,
      reason: 'Medical emergency checkup',
      status: 'approved',
      payPeriod: yearMonth,
      requestedAt: new Date(`${yearMonth}-03T10:00:00Z`).toISOString(),
      processedAt: new Date(`${yearMonth}-03T14:30:00Z`).toISOString(),
      processedBy: 'Admin HR'
    },
    {
      employeeId: employeeUid,
      employeeName,
      amount: 800,
      reason: 'Home utility bills',
      status: 'pending',
      payPeriod: yearMonth,
      requestedAt: new Date(`${yearMonth}-06T11:00:00Z`).toISOString()
    }
  ];

  for (const adv of sampleAdvances) {
    await submitAdvanceRequest(adv);
  }
}
