import React, { useState, useEffect } from 'react';
import { EmployeeProfile, AttendanceRecord, SystemConfig } from '../types';
import { getEmployeeAttendance, deleteAttendanceRecord, deleteAdvanceRequest } from '../dbUtils';
import AttendanceForm from './AttendanceForm';
import AdvanceRequestForm from './AdvanceRequestForm';
import {
  Wallet,
  Coins,
  Receipt,
  LogOut,
  CalendarDays,
  User,
  Clock,
  ArrowRightLeft,
  Moon,
  Sun,
  Calendar,
  Sparkles,
  Trash2
} from 'lucide-react';

interface EmployeeDashboardProps {
  profile: EmployeeProfile;
  config: SystemConfig;
  onLogout: () => void;
}

export default function EmployeeDashboard({ profile, config, onLogout }: EmployeeDashboardProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(config.currentPayPeriod);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Computed state
  const [stats, setStats] = useState({
    totalEarned: 0,
    advanceTaken: 0,
    netSalary: 0,
    totalHours: 0,
    dayHours: 0,
    nightHours: 0,
  });

  const loadData = async () => {
    try {
      // Fetch attendance
      const records = await getEmployeeAttendance(profile.uid, selectedPeriod);
      setAttendance(records);
    } catch (err) {
      console.error('Error loading employee dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile.uid, selectedPeriod, refreshTrigger]);

  // Recalculate stats whenever attendance or refresh triggers
  useEffect(() => {
    const activeAttendance = attendance.filter((r) => r.status === 'approved');
    
    const totalEarned = activeAttendance.reduce((sum, r) => sum + r.earnedAmount, 0);
    const totalHours = activeAttendance.reduce((sum, r) => sum + r.hoursWorked, 0);
    
    const dayHours = activeAttendance
      .filter((r) => r.shiftType === 'day')
      .reduce((sum, r) => sum + r.hoursWorked, 0);
      
    const nightHours = activeAttendance
      .filter((r) => r.shiftType === 'night')
      .reduce((sum, r) => sum + r.hoursWorked, 0);

    // Fetch advance stats from storage
    import('../dbUtils').then(async (dbUtils) => {
      const advs = await dbUtils.getEmployeeAdvanceRequests(profile.uid, selectedPeriod);
      const approvedAdvance = advs
        .filter((a) => a.status === 'approved')
        .reduce((sum, a) => sum + a.amount, 0);

      setStats({
        totalEarned,
        advanceTaken: approvedAdvance,
        netSalary: totalEarned - approvedAdvance,
        totalHours,
        dayHours,
        nightHours,
      });
    });
  }, [attendance, profile.uid, selectedPeriod, refreshTrigger]);

  // Generate available periods for selector (current month and previous 5 months)
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

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDeleteAttendance = async (id: string) => {
    if (confirm('Are you sure you want to delete this attendance log?')) {
      await deleteAttendanceRecord(id);
      handleRefresh();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Upper Header Profile Block */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 bg-indigo-600/10 text-indigo-400 rounded-2xl flex items-center justify-center font-bold text-xl border border-indigo-500/20 shrink-0">
            {profile.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-50 font-sans tracking-tight">{profile.name}</h1>
            <p className="text-xs text-zinc-400 font-medium flex items-center mt-1">
              <User className="h-3 w-3 mr-1 text-indigo-400" />
              {profile.designation}
              <span className="mx-2 text-zinc-750">|</span>
              <CalendarDays className="h-3 w-3 mr-1 text-zinc-550" />
              Hourly Rate: {profile.hourlyRate} ৳/hr
            </p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center space-x-3 self-end md:self-center">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-zinc-500">
              <Calendar className="h-4 w-4" />
            </span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-8 text-sm font-semibold text-zinc-300 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
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
            className="border border-zinc-800 hover:bg-red-955/20 hover:text-red-400 rounded-xl p-2 text-zinc-400 transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs font-semibold hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Earned Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-sans">
                Total Salary Earned
              </span>
              <h2 className="text-3xl font-extrabold text-zinc-50 font-sans mt-1">
                {stats.totalEarned.toLocaleString()} ৳
              </h2>
            </div>
            <div className="p-3 rounded-xl bg-emerald-955/30 text-emerald-400 border border-emerald-900/30">
              <Coins className="h-6 w-6" />
            </div>
          </div>
          <div className="border-t border-zinc-850 pt-4 mt-6 flex justify-between text-xs text-zinc-550 font-sans">
            <span>Hours Worked: {stats.totalHours} hrs</span>
            <span className="text-emerald-400 font-medium">Automatic Calculations</span>
          </div>
        </div>

        {/* Advance Subtraction Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-sans">
                Advance Salary Deducted
              </span>
              <h2 className="text-3xl font-extrabold text-zinc-50 font-sans mt-1">
                {stats.advanceTaken.toLocaleString()} ৳
              </h2>
            </div>
            <div className="p-3 rounded-xl bg-rose-955/30 text-rose-400 border border-rose-900/30">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
          </div>
          <div className="border-t border-zinc-850 pt-4 mt-6 flex justify-between text-xs text-zinc-550 font-sans">
            <span>Instant Deductions</span>
            <span className="text-rose-400 font-medium">Auto-Approved Offline</span>
          </div>
        </div>

        {/* Running Balance Card */}
        <div className="bg-gradient-to-tr from-indigo-950 via-zinc-900 to-zinc-900 border border-indigo-900/30 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider font-sans">
                Net Salary To Receive
              </span>
              <h2 className="text-3xl font-black font-sans mt-1 text-zinc-50">
                {stats.netSalary.toLocaleString()} ৳
              </h2>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-400/20">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <div className="border-t border-indigo-950/50 pt-4 mt-6 flex justify-between text-xs text-indigo-300 font-sans">
            <span>Pay Cycle: {selectedPeriod}</span>
            <span className="font-extrabold text-amber-400 flex items-center">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-400 animate-pulse" />
              Running Net Total
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form and Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (Forms) - Span 5 */}
        <div className="lg:col-span-5 space-y-6">
          <AttendanceForm profile={profile} config={config} onSuccess={handleRefresh} />
        </div>

        {/* Right Column (Attendance Logs) - Span 7 */}
        <div className="lg:col-span-7 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-zinc-50 font-sans flex items-center">
              <Receipt className="h-5 w-5 mr-2 text-indigo-400" />
              Logged Attendance Sheets
            </h3>
            <span className="text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">
              {attendance.length} Total Shifts
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {attendance.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Clock className="h-10 w-10 text-zinc-700 mb-2" />
                <p className="text-sm font-semibold text-zinc-400 font-sans">No attendance logs found</p>
                <p className="text-xs text-zinc-550 font-sans mt-0.5">Use the attendance form to log your shifts</p>
              </div>
            ) : (
              <div className="min-w-[600px] divide-y divide-zinc-850 font-sans">
                <div className="grid grid-cols-12 gap-2 pb-2.5 text-xs font-semibold text-zinc-550 uppercase tracking-wider">
                  <div className="col-span-3">Date / Shift</div>
                  <div className="col-span-3">Times (Hours)</div>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-1 text-right">Bonus</div>
                  <div className="col-span-2 text-right text-indigo-400 font-bold">Earned</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                <div className="space-y-1.5 pt-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {attendance.map((rec) => (
                    <div
                      key={rec.id}
                      className="grid grid-cols-12 gap-2 py-2.5 items-center hover:bg-zinc-950/60 rounded-lg px-1 transition-colors border-b border-dashed border-zinc-850 last:border-none"
                    >
                      {/* Date / Shift */}
                      <div className="col-span-3">
                        <p className="text-sm font-bold text-zinc-200">
                          {new Date(rec.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-[10px] text-zinc-500 flex items-center mt-0.5">
                          {rec.shiftType === 'day' ? (
                            <span className="flex items-center text-amber-400">
                              <Sun className="h-3 w-3 mr-0.5" /> Day Shift
                            </span>
                          ) : (
                            <span className="flex items-center text-indigo-400 font-semibold">
                              <Moon className="h-3 w-3 mr-0.5" /> Night Shift
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Times (Hours) */}
                      <div className="col-span-3 font-mono">
                        <p className="text-xs text-zinc-350">
                          {rec.startTime} - {rec.endTime}
                        </p>
                        <p className="text-[10px] text-zinc-550 mt-0.5">
                          {rec.hoursWorked} Worked Hours
                        </p>
                      </div>

                      {/* Hourly Rate */}
                      <div className="col-span-2 text-right font-semibold text-zinc-300">
                        {rec.hourlyRateApplied} ৳/hr
                      </div>

                      {/* Bonus */}
                      <div className="col-span-1 text-right font-semibold text-zinc-300">
                        {rec.bonusApplied > 0 ? (
                          <span className="text-indigo-400 font-bold">+{rec.bonusApplied} ৳</span>
                        ) : (
                          <span className="text-zinc-650">—</span>
                        )}
                      </div>

                      {/* Earned amount */}
                      <div className="col-span-2 text-right font-extrabold text-zinc-100">
                        {rec.earnedAmount} ৳
                      </div>

                      {/* Delete Action */}
                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => handleDeleteAttendance(rec.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-955/20 rounded-lg transition-colors cursor-pointer"
                          title="Delete Attendance record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 mt-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-zinc-500 uppercase tracking-wider font-semibold font-sans">Day Shift Stats</p>
              <p className="text-sm font-bold text-zinc-300 font-mono mt-0.5">{stats.dayHours} hrs worked</p>
            </div>
            <div>
              <p className="text-indigo-400 uppercase tracking-wider font-semibold font-sans">Night Shift Stats</p>
              <p className="text-sm font-bold text-indigo-400 font-mono mt-0.5">{stats.nightHours} hrs worked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Advance Request Block */}
      <AdvanceRequestForm
        profile={profile}
        config={config}
        onSuccess={handleRefresh}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
