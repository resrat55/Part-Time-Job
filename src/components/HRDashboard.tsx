import React, { useState, useEffect } from 'react';
import { EmployeeProfile, AttendanceRecord, AdvanceRequest, SystemConfig, RecordStatus } from '../types';
import {
  getAllEmployees,
  getAllAttendance,
  getAllAdvanceRequests,
  updateAdvanceRequestStatus,
  updateAttendanceRecordStatus,
  updateEmployeeRate,
  updateSystemConfig,
  getSystemConfig
} from '../dbUtils';
import {
  Users,
  Clock,
  Landmark,
  Settings,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Coins,
  ArrowRightLeft,
  Calendar,
  Sparkles,
  AlertCircle,
  LogOut,
  Edit2,
  UserCheck,
  Percent,
  Trash2
} from 'lucide-react';

interface HRDashboardProps {
  profile: EmployeeProfile;
  config: SystemConfig;
  onLogout: () => void;
  onConfigChange: () => void;
}

type HRTab = 'overview' | 'advances' | 'attendance' | 'employees' | 'settings';

export default function HRDashboard({ profile, config, onLogout, onConfigChange }: HRDashboardProps) {
  const [activeTab, setActiveTab] = useState<HRTab>('overview');
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [advances, setAdvances] = useState<AdvanceRequest[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(config.currentPayPeriod);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected employee for detailed sheet modal
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);

  // Employee Edit Rate form state
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState('');

  // Rejection reason form state
  const [rejectingAdvId, setRejectingAdvId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Config settings form state
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(config.defaultHourlyRate.toString());
  const [nightShiftBasicRate, setNightShiftBasicRate] = useState(config.nightShiftBasicRate.toString());
  const [nightShiftAllowance, setNightShiftAllowance] = useState(config.nightShiftAllowance.toString());
  const [payPeriod, setPayPeriod] = useState(config.currentPayPeriod);

  // Stats
  const [stats, setStats] = useState({
    totalDisbursedEarned: 0,
    totalDisbursedAdvance: 0,
    netPayable: 0,
    totalHoursWorked: 0,
    pendingAdvancesCount: 0,
    pendingAttendanceCount: 0
  });

  const loadData = async () => {
    try {
      const emps = await getAllEmployees();
      setEmployees(emps);

      const atts = await getAllAttendance(selectedPeriod);
      setAttendance(atts);

      const advRequests = await getAllAdvanceRequests(selectedPeriod);
      setAdvances(advRequests);
    } catch (err) {
      console.error('Error loading HR data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriod, refreshTrigger]);

  // Recalculate Summary Stats
  useEffect(() => {
    const approvedAtts = attendance.filter((a) => a.status === 'approved');
    const totalEarned = approvedAtts.reduce((sum, r) => sum + r.earnedAmount, 0);
    const totalHours = approvedAtts.reduce((sum, r) => sum + r.hoursWorked, 0);

    const approvedAdvs = advances.filter((a) => a.status === 'approved');
    const totalAdvance = approvedAdvs.reduce((sum, r) => sum + r.amount, 0);

    const pendingAdvs = advances.filter((a) => a.status === 'pending').length;
    const pendingAtts = attendance.filter((a) => a.status === 'pending').length;

    setStats({
      totalDisbursedEarned: totalEarned,
      totalDisbursedAdvance: totalAdvance,
      netPayable: totalEarned - totalAdvance,
      totalHoursWorked: totalHours,
      pendingAdvancesCount: pendingAdvs,
      pendingAttendanceCount: pendingAtts
    });
  }, [attendance, advances]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleApproveAdvance = async (reqId: string) => {
    try {
      await updateAdvanceRequestStatus(reqId, 'approved', profile.uid, profile.name);
      handleRefresh();
    } catch (err) {
      console.error('Failed to approve advance:', err);
    }
  };

  const handleRejectAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingAdvId) return;
    try {
      await updateAdvanceRequestStatus(rejectingAdvId, 'rejected', profile.uid, profile.name, rejectReason);
      setRejectingAdvId(null);
      setRejectReason('');
      handleRefresh();
    } catch (err) {
      console.error('Failed to reject advance:', err);
    }
  };

  const handleApproveAttendance = async (attId: string) => {
    try {
      await updateAttendanceRecordStatus(attId, 'approved');
      handleRefresh();
    } catch (err) {
      console.error('Failed to approve attendance:', err);
    }
  };

  const handleRejectAttendance = async (attId: string) => {
    try {
      await updateAttendanceRecordStatus(attId, 'rejected');
      handleRefresh();
    } catch (err) {
      console.error('Failed to reject attendance:', err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSystemConfig({
        defaultHourlyRate: parseFloat(defaultHourlyRate) || 150,
        nightShiftBasicRate: parseFloat(nightShiftBasicRate) || 70,
        nightShiftAllowance: parseFloat(nightShiftAllowance) || 100,
        currentPayPeriod: payPeriod,
      });
      onConfigChange();
      alert('System configuration updated successfully.');
      handleRefresh();
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  };

  const handleUpdateEmpRate = async (empId: string) => {
    try {
      const rateNum = parseFloat(editingRate);
      if (isNaN(rateNum) || rateNum <= 0) return;
      await updateEmployeeRate(empId, rateNum);
      setEditingEmpId(null);
      setEditingRate('');
      handleRefresh();
    } catch (err) {
      console.error('Failed to update rate:', err);
    }
  };

  // Generate available periods for selector
  const getPeriodOptions = () => {
    const options = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      const value = `${year}-${month}`;
      options.push({ label, value });
      date.setMonth(date.getMonth() - 1);
    }
    return options;
  };

  // Helper calculations per employee
  const getEmployeeStats = (empId: string) => {
    const empAtts = attendance.filter((a) => a.employeeId === empId && a.status === 'approved');
    const empEarned = empAtts.reduce((sum, a) => sum + a.earnedAmount, 0);
    const empHours = empAtts.reduce((sum, a) => sum + a.hoursWorked, 0);

    const empAdvs = advances.filter((a) => a.employeeId === empId && a.status === 'approved');
    const empAdvance = empAdvs.reduce((sum, a) => sum + a.amount, 0);

    return {
      earned: empEarned,
      advance: empAdvance,
      net: empEarned - empAdvance,
      hours: empHours
    };
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Panel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 bg-indigo-600/10 text-indigo-400 rounded-2xl flex items-center justify-center font-bold text-xl border border-indigo-500/20 shrink-0">
            M
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-50 font-sans tracking-tight">HR Administrative Portal</h1>
            <p className="text-xs text-zinc-400 font-medium flex items-center mt-1">
              <UserCheck className="h-3.5 w-3.5 mr-1 text-indigo-400" />
              Role: Manager / HR Admin
              <span className="mx-2 text-zinc-700">|</span>
              <Calendar className="h-3.5 w-3.5 mr-1 text-indigo-400" />
              Current Active Pay Cycle: {config.currentPayPeriod}
            </p>
          </div>
        </div>

        {/* period selection & logout */}
        <div className="flex items-center space-x-3 self-end md:self-center">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-zinc-500">
              <Calendar className="h-4 w-4" />
            </span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-8 text-sm font-semibold text-zinc-350 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
            >
              {getPeriodOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-500 w-0 h-0"></div>
          </div>

          <button
            onClick={onLogout}
            className="border border-zinc-850 hover:bg-red-955/20 hover:text-red-400 rounded-xl p-2 text-zinc-450 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs font-semibold hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Admin Tab Selector */}
      <div className="flex overflow-x-auto gap-2 border-b border-zinc-800 pb-1 shrink-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-4 text-sm font-semibold rounded-xl transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'text-indigo-450 bg-indigo-600/10 border-b-2 border-indigo-500'
              : 'text-zinc-450 hover:text-zinc-200 border-b-2 border-transparent'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Users className="h-4 w-4" />
            <span>Overview</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className={`py-2 px-4 text-sm font-semibold rounded-xl transition-all shrink-0 relative ${
            activeTab === 'advances'
              ? 'text-indigo-450 bg-indigo-600/10 border-b-2 border-indigo-500'
              : 'text-zinc-450 hover:text-zinc-200 border-b-2 border-transparent'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Landmark className="h-4 w-4" />
            <span>Advance Requests</span>
            {stats.pendingAdvancesCount > 0 && (
              <span className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                {stats.pendingAdvancesCount}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-2 px-4 text-sm font-semibold rounded-xl transition-all shrink-0 relative ${
            activeTab === 'attendance'
              ? 'text-indigo-450 bg-indigo-600/10 border-b-2 border-indigo-500'
              : 'text-zinc-450 hover:text-zinc-200 border-b-2 border-transparent'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Clock className="h-4 w-4" />
            <span>Attendance Sheets</span>
            {stats.pendingAttendanceCount > 0 && (
              <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                {stats.pendingAttendanceCount}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`py-2 px-4 text-sm font-semibold rounded-xl transition-all shrink-0 ${
            activeTab === 'employees'
              ? 'text-indigo-450 bg-indigo-600/10 border-b-2 border-indigo-500'
              : 'text-zinc-450 hover:text-zinc-200 border-b-2 border-transparent'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Users className="h-4 w-4" />
            <span>Employee Registry</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2 px-4 text-sm font-semibold rounded-xl transition-all shrink-0 ${
            activeTab === 'settings'
              ? 'text-indigo-450 bg-indigo-600/10 border-b-2 border-indigo-500'
              : 'text-zinc-450 hover:text-zinc-200 border-b-2 border-transparent'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </div>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-zinc-450 uppercase tracking-wider">Gross Salaries Earned</span>
              <h2 className="text-2xl font-black text-zinc-100 mt-1">{stats.totalDisbursedEarned.toLocaleString()} ৳</h2>
              <div className="text-[10px] text-zinc-500 mt-4 border-t border-zinc-850 pt-2 flex justify-between">
                <span>Total Active Hours: {stats.totalHoursWorked} hrs</span>
                <span className="text-indigo-405 font-bold">Approved Only</span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-zinc-450 uppercase tracking-wider">Total Advance Disbursed</span>
              <h2 className="text-2xl font-black text-zinc-100 mt-1">{stats.totalDisbursedAdvance.toLocaleString()} ৳</h2>
              <div className="text-[10px] text-zinc-500 mt-4 border-t border-zinc-850 pt-2 flex justify-between">
                <span>Subtracts Automatically</span>
                <span className="text-rose-455 font-semibold">{stats.pendingAdvancesCount} pending</span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-zinc-450 uppercase tracking-wider">Net Payable Salary</span>
              <h2 className="text-2xl font-black text-indigo-400 mt-1">{stats.netPayable.toLocaleString()} ৳</h2>
              <div className="text-[10px] text-zinc-500 mt-4 border-t border-zinc-850 pt-2 flex justify-between">
                <span>(Earned - Advances)</span>
                <span className="text-emerald-455 font-semibold">Ready to disburse</span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-zinc-450 uppercase tracking-wider">Pending Tasks</span>
              <h2 className="text-2xl font-black text-amber-500 mt-1">
                {stats.pendingAdvancesCount + stats.pendingAttendanceCount} Needs Action
              </h2>
              <div className="text-[10px] text-zinc-500 mt-4 border-t border-zinc-850 pt-2 flex justify-between">
                <span>Advs: {stats.pendingAdvancesCount}</span>
                <span>Attendance: {stats.pendingAttendanceCount}</span>
              </div>
            </div>
          </div>

          {/* Employee summaries table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h3 className="text-lg font-bold text-zinc-50 font-sans">Employee Salary Ledger ({selectedPeriod})</h3>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-550" />
                <input
                  type="text"
                  placeholder="Search staff, designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Regular Rate</th>
                    <th className="py-3 px-4 text-right">Hours Worked</th>
                    <th className="py-3 px-4 text-right">Gross Salary</th>
                    <th className="py-3 px-4 text-right">Advance Taken</th>
                    <th className="py-3 px-4 text-right text-indigo-400">Net Salary</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {filteredEmployees.map((emp) => {
                    const empStats = getEmployeeStats(emp.uid);
                    return (
                      <tr key={emp.uid} className="hover:bg-zinc-950/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="text-sm font-bold text-zinc-200">{emp.name}</p>
                          <p className="text-xs text-zinc-500">{emp.designation}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-zinc-400">
                          {emp.hourlyRate} ৳/hr
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs text-zinc-400">
                          {empStats.hours} hrs
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-sm font-bold text-zinc-200">
                          {empStats.earned.toLocaleString()} ৳
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-sm font-bold text-rose-400">
                          {empStats.advance > 0 ? `-${empStats.advance.toLocaleString()} ৳` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-indigo-400">
                          {empStats.net.toLocaleString()} ৳
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs font-bold py-1 px-2.5 rounded-lg transition-colors border border-indigo-500/20 cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Advance Requests */}
      {activeTab === 'advances' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-50 font-sans mb-4 flex items-center">
            <Landmark className="h-5 w-5 mr-2 text-indigo-400" />
            Manage Employee Advance Salary Requests
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {advances.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <ShieldAlert className="h-10 w-10 text-zinc-700 mb-2" />
                <p className="text-sm font-semibold text-zinc-400">No advance requests found in this cycle</p>
              </div>
            ) : (
              advances.map((req) => (
                <div
                  key={req.id}
                  className="border border-zinc-800 rounded-2xl p-4 bg-zinc-950 hover:bg-zinc-900/60 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-extrabold text-zinc-200">{req.employeeName}</span>
                      <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full font-medium">
                        {req.payPeriod}
                      </span>
                    </div>
                    <p className="text-sm font-black text-rose-400 font-sans">Request Amount: {req.amount} ৳</p>
                    <p className="text-xs text-zinc-400 italic">"Reason: {req.reason}"</p>
                    <p className="text-[10px] text-zinc-500">
                      Requested Date: {new Date(req.requestedAt).toLocaleString()}
                    </p>
                    {req.rejectionReason && (
                      <p className="text-xs text-red-405 font-medium italic bg-red-955/20 border border-red-900/40 p-2 rounded-lg mt-1">
                        Rejection Reason: {req.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApproveAdvance(req.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer"
                        >
                          Approve Advance
                        </button>
                        <button
                          onClick={() => setRejectingAdvId(req.id)}
                          className="bg-red-955/30 hover:bg-red-950/50 text-red-400 border border-red-900/50 text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          req.status === 'approved'
                            ? 'bg-emerald-955/30 text-emerald-400 border border-emerald-900/40'
                            : 'bg-red-955/30 text-red-400 border border-red-900/40'
                        }`}
                      >
                        {req.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Attendance Sheets */}
      {activeTab === 'attendance' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-50 font-sans mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-indigo-400" />
            Verify Staff Attendance Sheets
          </h3>

          <div className="overflow-x-auto">
            {attendance.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Clock className="h-10 w-10 text-zinc-700 mb-2" />
                <p className="text-sm font-semibold text-zinc-400">No attendance sheets submitted in this cycle</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Name</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Times</th>
                    <th className="py-3 px-4">Hours</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Earning</th>
                    <th className="py-3 px-4 text-center">Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-sm text-zinc-300">
                  {attendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-zinc-950/60 transition-all">
                      <td className="py-3 px-4 font-bold text-zinc-200">{rec.employeeName}</td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-400">{rec.date}</td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-400">{rec.startTime} - {rec.endTime}</td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-zinc-350">{rec.hoursWorked} hrs</td>
                      <td className="py-3 px-4">
                        {rec.shiftType === 'day' ? (
                          <span className="text-amber-400 bg-amber-950/20 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-900/30">
                            Day
                          </span>
                        ) : (
                          <span className="text-indigo-400 bg-indigo-950/20 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-900/30">
                            Night
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-zinc-200">{rec.earnedAmount} ৳</td>
                      <td className="py-3 px-4 text-center">
                        {rec.status === 'pending' ? (
                          <div className="flex justify-center space-x-1.5">
                            <button
                              onClick={() => handleApproveAttendance(rec.id)}
                              className="bg-emerald-955/30 hover:bg-emerald-950/50 text-emerald-400 p-1.5 rounded-lg transition-colors border border-emerald-900/30 cursor-pointer"
                              title="Approve"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRejectAttendance(rec.id)}
                              className="bg-red-955/30 hover:bg-red-950/50 text-red-400 p-1.5 rounded-lg transition-colors border border-red-900/30 cursor-pointer"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              rec.status === 'approved'
                                ? 'bg-emerald-955/30 text-emerald-400 border border-emerald-900/40'
                                : 'bg-red-955/30 text-red-400 border border-red-900/40'
                            }`}
                          >
                            {rec.status === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Employee Registry */}
      {activeTab === 'employees' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-zinc-50 font-sans flex items-center">
              <Users className="h-5 w-5 mr-2 text-indigo-400" />
              Manage Employee Hourly Rates & Designations
            </h3>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-650" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.uid}
                className="border border-zinc-850 rounded-2xl p-4 bg-zinc-950 hover:bg-zinc-900/60 transition-all flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-zinc-200 text-sm">{emp.name}</h4>
                    <p className="text-xs text-zinc-400">{emp.designation}</p>
                    <p className="text-[10px] text-zinc-505 mt-1 font-mono">{emp.email}</p>
                  </div>
                  <div className="bg-indigo-600/10 text-indigo-400 text-xs font-bold px-2.5 py-1 rounded-xl font-mono border border-indigo-500/20">
                    {emp.hourlyRate} ৳/hr
                  </div>
                </div>

                <div className="border-t border-zinc-850/70 pt-3 mt-4 flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500">Joined: {emp.joinedDate}</span>

                  {editingEmpId === emp.uid ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        placeholder="Rate"
                        value={editingRate}
                        onChange={(e) => setEditingRate(e.target.value)}
                        className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-0.5 text-xs font-semibold text-zinc-100"
                      />
                      <button
                        onClick={() => handleUpdateEmpRate(emp.uid)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingEmpId(null)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingEmpId(emp.uid);
                        setEditingRate(emp.hourlyRate.toString());
                      }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3 mr-1" /> Edit Rate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: System Settings */}
      {activeTab === 'settings' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-50 font-sans mb-6 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-indigo-400" />
            Global Salary Configurations
          </h3>

          <form onSubmit={handleSaveConfig} className="space-y-6 max-w-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Default Day Hourly Rate (৳ / hr)
                </label>
                <input
                  type="number"
                  required
                  value={defaultHourlyRate}
                  onChange={(e) => setDefaultHourlyRate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Active Pay Period (YYYY-MM)
                </label>
                <input
                  type="month"
                  required
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="border-t border-zinc-850 pt-4">
              <h4 className="text-sm font-bold text-zinc-350 mb-3 flex items-center">
                <Percent className="h-4 w-4 mr-1 text-indigo-400" /> Night Shift Constants
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Night Shift Basic Rate (৳ / hr)
                  </label>
                  <input
                    type="number"
                    required
                    value={nightShiftBasicRate}
                    onChange={(e) => setNightShiftBasicRate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Standard is 70 Taka basic per night shift hour.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Night Shift Bonus (৳ per shift)
                  </label>
                  <input
                    type="number"
                    required
                    value={nightShiftAllowance}
                    onChange={(e) => setNightShiftAllowance(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Flat allowance added automatically if night shift is worked (e.g., 100 ৳).
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 px-6 font-semibold text-sm shadow-sm transition-all cursor-pointer"
            >
              Save Configurations
            </button>
          </form>
        </div>
      )}

      {/* Reject Advance Reason Dialog overlay */}
      {rejectingAdvId && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl max-w-md w-full">
            <h4 className="text-md font-bold text-zinc-50 mb-2">Reject Advance Request</h4>
            <p className="text-xs text-zinc-400 mb-4">
              Please enter a brief reason for rejecting this advance request.
            </p>

            <form onSubmit={handleRejectAdvance} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="e.g. Budget limitations, already exceeded maximum limits, etc."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 resize-none placeholder-zinc-600"
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectingAdvId(null)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-400 hover:bg-zinc-850 text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Details Modal Overlay */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-zinc-955/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-zinc-50">{selectedEmployee.name}'s Attendance & Advances</h3>
                <p className="text-xs text-zinc-400">{selectedEmployee.designation} • Rate: {selectedEmployee.hourlyRate} ৳/hr</p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-bold bg-transparent border-none cursor-pointer"
              >
                Close ×
              </button>
            </div>

            {/* Attendance list in modal */}
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-zinc-450 uppercase tracking-wider mb-2">Shift Attendance Sheets ({selectedPeriod})</h4>
                <div className="border border-zinc-800 rounded-xl overflow-hidden text-xs">
                  <div className="bg-zinc-950 grid grid-cols-12 gap-2 p-2.5 font-bold text-zinc-400">
                    <div className="col-span-3">Date</div>
                    <div className="col-span-3">Times (Hours)</div>
                    <div className="col-span-2">Shift</div>
                    <div className="col-span-2 text-right">Earned</div>
                    <div className="col-span-2 text-center">Status</div>
                  </div>
                  <div className="divide-y divide-zinc-850 max-h-48 overflow-y-auto bg-zinc-900/60">
                    {attendance.filter(a => a.employeeId === selectedEmployee.uid).length === 0 ? (
                      <div className="p-4 text-center text-zinc-500">No shifts recorded</div>
                    ) : (
                      attendance.filter(a => a.employeeId === selectedEmployee.uid).map(rec => (
                        <div key={rec.id} className="grid grid-cols-12 gap-2 p-2.5 items-center text-zinc-350 font-sans">
                          <div className="col-span-3 font-semibold">{rec.date}</div>
                          <div className="col-span-3 font-mono">{rec.startTime}-{rec.endTime} ({rec.hoursWorked} hrs)</div>
                          <div className="col-span-2">
                            {rec.shiftType === 'day' ? 'Day' : 'Night'}
                          </div>
                          <div className="col-span-2 text-right font-bold">{rec.earnedAmount} ৳</div>
                          <div className="col-span-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                              rec.status === 'approved' ? 'bg-emerald-955/30 text-emerald-400 border border-emerald-900/40' : 'bg-red-955/30 text-red-400 border border-red-900/40'
                            }`}>
                              {rec.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Advances list in modal */}
              <div>
                <h4 className="text-xs font-bold text-zinc-450 uppercase tracking-wider mb-2">Advance Salary History ({selectedPeriod})</h4>
                <div className="border border-zinc-800 rounded-xl overflow-hidden text-xs">
                  <div className="bg-zinc-950 grid grid-cols-12 gap-2 p-2.5 font-bold text-zinc-400">
                    <div className="col-span-4">Requested At</div>
                    <div className="col-span-4">Reason</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-2 text-center">Status</div>
                  </div>
                  <div className="divide-y divide-zinc-850 max-h-40 overflow-y-auto bg-zinc-900/60">
                    {advances.filter(a => a.employeeId === selectedEmployee.uid).length === 0 ? (
                      <div className="p-4 text-center text-zinc-500">No advance requests</div>
                    ) : (
                      advances.filter(a => a.employeeId === selectedEmployee.uid).map(req => (
                        <div key={req.id} className="grid grid-cols-12 gap-2 p-2.5 items-center text-zinc-350 font-sans">
                          <div className="col-span-4 font-semibold">{new Date(req.requestedAt).toLocaleDateString()}</div>
                          <div className="col-span-4 italic text-zinc-400">"{req.reason}"</div>
                          <div className="col-span-2 text-right font-extrabold text-rose-400">-{req.amount} ৳</div>
                          <div className="col-span-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                              req.status === 'approved' ? 'bg-emerald-955/30 text-emerald-400 border border-emerald-900/40' : req.status === 'pending' ? 'bg-amber-955/30 text-amber-400 border border-amber-900/40' : 'bg-red-955/30 text-red-400 border border-red-900/40'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
