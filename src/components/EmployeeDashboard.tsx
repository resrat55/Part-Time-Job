import React, { useState, useEffect } from 'react';
import { EmployeeProfile, AttendanceRecord, SystemConfig, Announcement, AdvanceRequest } from '../types';
import {
  getEmployeeAttendance,
  deleteAttendanceRecord,
  updateEmployeeProfileFields,
  getAnnouncements,
  addAnnouncement,
  deleteAnnouncement,
  getEmployeeAllAttendance,
  getEmployeeAllAdvances,
  updateSystemConfig
} from '../dbUtils';
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
  Trash2,
  Edit2,
  FileText,
  Plus,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Printer,
  Clipboard,
  ClipboardCheck,
  RefreshCw
} from 'lucide-react';

interface EmployeeDashboardProps {
  profile: EmployeeProfile;
  config: SystemConfig;
  onLogout: () => void;
  onProfileUpdate: () => void;
}

export default function EmployeeDashboard({ profile, config, onLogout, onProfileUpdate }: EmployeeDashboardProps) {
  const currentRealMonth = new Date().toISOString().substring(0, 7);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'advance' | 'analytics' | 'profile'>('overview');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allAdvances, setAllAdvances] = useState<AdvanceRequest[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(currentRealMonth);
  const [analyticsPeriod, setAnalyticsPeriod] = useState(currentRealMonth);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Profile & Rate Configuration Form States
  const [profileName, setProfileName] = useState(profile.name);
  const [profileDesignation, setProfileDesignation] = useState(profile.designation);
  const [profileRate, setProfileRate] = useState(profile.hourlyRate.toString());
  const [nightBasicRate, setNightBasicRate] = useState(config.nightShiftBasicRate.toString());
  const [nightAllowance, setNightAllowance] = useState(config.nightShiftAllowance.toString());
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Announcements States
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');

  // Sync profile & config state variables if parent updates
  useEffect(() => {
    setProfileName(profile.name);
    setProfileDesignation(profile.designation);
    setProfileRate(profile.hourlyRate.toString());
    setNightBasicRate(config.nightShiftBasicRate.toString());
    setNightAllowance(config.nightShiftAllowance.toString());
  }, [profile, config]);

  // Load announcements whenever we enter profile tab or refresh
  useEffect(() => {
    if (activeTab === 'profile') {
      getAnnouncements().then(setAnnouncements).catch(console.error);
    }
  }, [activeTab, refreshTrigger]);

  // Computed stats state
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
      const records = await getEmployeeAttendance(profile.uid, selectedPeriod);
      setAttendance(records);
      
      const allAtts = await getEmployeeAllAttendance(profile.uid);
      const allAdvs = await getEmployeeAllAdvances(profile.uid);
      setAllAttendance(allAtts);
      setAllAdvances(allAdvs);
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

  const getPeriodOptions = () => {
    const periodSet = new Set<string>();
    
    // Always include current real calendar month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    periodSet.add(currentMonth);

    // Include last 12 months
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      const yr = d.getFullYear();
      const mn = String(d.getMonth() + 1).padStart(2, '0');
      periodSet.add(`${yr}-${mn}`);
      d.setMonth(d.getMonth() - 1);
    }

    // Include any payPeriod from records
    allAttendance.forEach((r) => { if (r.payPeriod) periodSet.add(r.payPeriod); });
    allAdvances.forEach((a) => { if (a.payPeriod) periodSet.add(a.payPeriod); });

    const sortedPeriods = Array.from(periodSet).sort((a, b) => b.localeCompare(a));

    return sortedPeriods.map((period) => {
      const [yearStr, monthStr] = period.split('-');
      const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
      const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
      return { label, value: period };
    });
  };

  const getMonthlyAnalytics = () => {
    const monthlyMap: Record<string, {
      period: string;
      label: string;
      earned: number;
      hours: number;
      advances: number;
      net: number;
      dayHours: number;
      nightHours: number;
    }> = {};

    // Get list of last 6 months to ensure they're populated in order
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const period = `${year}-${month}`;
      const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyMap[period] = {
        period,
        label,
        earned: 0,
        hours: 0,
        advances: 0,
        net: 0,
        dayHours: 0,
        nightHours: 0
      };
      date.setMonth(date.getMonth() - 1);
    }

    // Accumulate all approved attendance logs
    allAttendance.forEach((r) => {
      if (r.status !== 'approved') return;
      const period = r.payPeriod;
      
      if (!monthlyMap[period]) {
        const [yr, mn] = period.split('-');
        const dummyDate = new Date(parseInt(yr), parseInt(mn) - 1, 1);
        const label = dummyDate.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyMap[period] = {
          period,
          label,
          earned: 0,
          hours: 0,
          advances: 0,
          net: 0,
          dayHours: 0,
          nightHours: 0
        };
      }

      monthlyMap[period].earned += r.earnedAmount;
      monthlyMap[period].hours += r.hoursWorked;
      if (r.shiftType === 'day') {
        monthlyMap[period].dayHours += r.hoursWorked;
      } else {
        monthlyMap[period].nightHours += r.hoursWorked;
      }
    });

    // Accumulate all approved advance logs
    allAdvances.forEach((a) => {
      if (a.status !== 'approved') return;
      const period = a.payPeriod;
      
      if (!monthlyMap[period]) {
        const [yr, mn] = period.split('-');
        const dummyDate = new Date(parseInt(yr), parseInt(mn) - 1, 1);
        const label = dummyDate.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyMap[period] = {
          period,
          label,
          earned: 0,
          hours: 0,
          advances: 0,
          net: 0,
          dayHours: 0,
          nightHours: 0
        };
      }
      monthlyMap[period].advances += a.amount;
    });

    // Compute net pay and clean decimals
    Object.keys(monthlyMap).forEach((p) => {
      monthlyMap[p].net = monthlyMap[p].earned - monthlyMap[p].advances;
      monthlyMap[p].earned = Math.round(monthlyMap[p].earned);
      monthlyMap[p].hours = parseFloat(monthlyMap[p].hours.toFixed(1));
      monthlyMap[p].dayHours = parseFloat(monthlyMap[p].dayHours.toFixed(1));
      monthlyMap[p].nightHours = parseFloat(monthlyMap[p].nightHours.toFixed(1));
    });

    return Object.values(monthlyMap).sort((a, b) => a.period.localeCompare(b.period));
  };

  const getSelectedMonthReportData = () => {
    const monthAtts = allAttendance.filter(r => r.payPeriod === analyticsPeriod && r.status === 'approved');
    const monthAdvs = allAdvances.filter(a => a.payPeriod === analyticsPeriod && a.status === 'approved');

    const totalEarned = monthAtts.reduce((sum, r) => sum + r.earnedAmount, 0);
    const totalHours = monthAtts.reduce((sum, r) => sum + r.hoursWorked, 0);
    const dayHours = monthAtts.filter(r => r.shiftType === 'day').reduce((sum, r) => sum + r.hoursWorked, 0);
    const nightHours = monthAtts.filter(r => r.shiftType === 'night').reduce((sum, r) => sum + r.hoursWorked, 0);
    const advanceTaken = monthAdvs.reduce((sum, a) => sum + a.amount, 0);
    const netPayable = totalEarned - advanceTaken;

    return {
      monthAtts,
      monthAdvs,
      totalEarned,
      totalHours,
      dayHours,
      nightHours,
      advanceTaken,
      netPayable
    };
  };

  const copyReportToClipboard = () => {
    const data = getSelectedMonthReportData();
    const [year, month] = analyticsPeriod.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    const reportText = `╔══════════════════════════════════════════════╗
  MONTHLY ATTENDANCE & PAYROLL STATEMENT
╚══════════════════════════════════════════════╝
  Month:       ${monthName}
  Employee:    ${profile.name}
  Designation: ${profile.designation}
  Standard Rate: ${profile.hourlyRate} ৳/hr
────────────────────────────────────────────────
  SUMMARY METRICS:
  • Total Worked Hours: ${data.totalHours} hrs
    - Day Shifts:       ${data.dayHours} hrs
    - Night Shifts:     ${data.nightHours} hrs
  • Gross Salary Earned: ${data.totalEarned} ৳
  • Salary Advances:     ${data.advanceTaken} ৳
────────────────────────────────────────────────
  NET PAYABLE:          ${data.netPayable} ৳
────────────────────────────────────────────────
  Generated via Offline Salary Registry Portal
  Date: ${new Date().toLocaleDateString()}
╚══════════════════════════════════════════════╝`;

    navigator.clipboard.writeText(reportText).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }).catch(err => console.error(err));
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

  // 12-Hour formatted times for logs display
  const formatTimeTo12Hour = (time24: string): string => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${mStr} ${ampm}`;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');

    const parsedRate = parseFloat(profileRate);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      setProfileError('Please enter a valid hourly rate greater than zero.');
      return;
    }

    const parsedNightBasic = parseFloat(nightBasicRate);
    const parsedNightAllowance = parseFloat(nightAllowance);
    if (isNaN(parsedNightBasic) || parsedNightBasic < 0 || isNaN(parsedNightAllowance) || parsedNightAllowance < 0) {
      setProfileError('Please enter valid night shift rate and bonus numbers.');
      return;
    }

    if (!profileName.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }

    try {
      await updateEmployeeProfileFields(profile.uid, {
        name: profileName.trim(),
        designation: profileDesignation.trim(),
        hourlyRate: parsedRate,
      });

      await updateSystemConfig({
        nightShiftBasicRate: parsedNightBasic,
        nightShiftAllowance: parsedNightAllowance,
      });

      setProfileSuccess('Your profile settings, hourly rate, and Night Announcement Bonus have been saved successfully!');
      onProfileUpdate(); // Reload App and propagate new details
    } catch (err) {
      console.error(err);
      setProfileError('Failed to update profile settings.');
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;

    try {
      await addAnnouncement(newAnnTitle.trim(), newAnnContent.trim());
      setNewAnnTitle('');
      setNewAnnContent('');
      handleRefresh(); // re-trigger getAnnouncements useEffect
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      try {
        await deleteAnnouncement(id);
        handleRefresh(); // re-trigger getAnnouncements useEffect
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
              <span className="mx-2 text-zinc-700">|</span>
              <CalendarDays className="h-3 w-3 mr-1 text-indigo-400" />
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
        </div>
      </div>

      {/* Separate Pages for Separate Tasks (Navigation Tab Bar) */}
      <div className="flex border-b border-zinc-800 overflow-x-auto space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 font-sans font-bold text-sm border-b-2 transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
          }`}
        >
          <Coins className="h-4.5 w-4.5" />
          <span>Salary Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-3 px-4 font-sans font-bold text-sm border-b-2 transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'attendance'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
          }`}
        >
          <Clock className="h-4.5 w-4.5" />
          <span>Attendance Desk</span>
        </button>

        <button
          onClick={() => setActiveTab('advance')}
          className={`py-3 px-4 font-sans font-bold text-sm border-b-2 transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'advance'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
          }`}
        >
          <ArrowRightLeft className="h-4.5 w-4.5" />
          <span>Salary Advances</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-3 px-4 font-sans font-bold text-sm border-b-2 transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'analytics'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
          }`}
        >
          <BarChart3 className="h-4.5 w-4.5 text-indigo-400" />
          <span>Analytics & Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-4 font-sans font-bold text-sm border-b-2 transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeTab === 'profile'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
          }`}
        >
          <User className="h-4.5 w-4.5" />
          <span>My Profile & News</span>
        </button>
      </div>

      {/* Render Page Based on Active Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
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
              <div className="border-t border-zinc-850 pt-4 mt-6 flex justify-between text-xs text-zinc-500 font-sans">
                <span>Hours Worked: {stats.totalHours} hrs</span>
                <span className="text-emerald-400 font-medium">Auto Computed</span>
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
              <div className="border-t border-zinc-850 pt-4 mt-6 flex justify-between text-xs text-zinc-500 font-sans">
                <span>Instant Deductions</span>
                <span className="text-rose-400 font-medium">Auto Approved</span>
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

          {/* Quick Stats Summary */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-base font-bold text-zinc-100 font-sans mb-4 flex items-center">
              <Coins className="h-5 w-5 mr-2 text-indigo-400" />
              Worked Hours Analysis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Regular Day Shifts</p>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-2xl font-black text-zinc-200">{stats.dayHours} hrs</span>
                  <span className="text-xs text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{profile.hourlyRate} ৳/hr</span>
                </div>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Special Night Shifts</p>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-2xl font-black text-indigo-400">{stats.nightHours} hrs</span>
                  <span className="text-xs text-indigo-400 bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-900/30">{config.nightShiftBasicRate} ৳/hr + bonus</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-4 font-sans leading-relaxed">
              * Note: Night shift starts automatically whenever your clock-out time falls between 12:00 AM and 7:00 AM. Regular Day shift applies to all other times. Edit any entries from the Attendance Desk tab.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (Forms) */}
          <div className="lg:col-span-5">
            <AttendanceForm
              profile={profile}
              config={config}
              onSuccess={handleRefresh}
              editingRecord={editingRecord}
              onCancelEdit={() => setEditingRecord(null)}
            />
          </div>

          {/* Right Column (Attendance Logs) */}
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
                  <p className="text-xs text-zinc-550 font-sans mt-0.5">Use the form to note down your shifts</p>
                </div>
              ) : (
                <div className="min-w-[600px] divide-y divide-zinc-850 font-sans">
                  <div className="grid grid-cols-12 gap-2 pb-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <div className="col-span-3">Date / Shift</div>
                    <div className="col-span-4">Times (12h Mode)</div>
                    <div className="col-span-2 text-right">Rate</div>
                    <div className="col-span-2 text-right text-indigo-400 font-bold">Earned</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  <div className="space-y-1.5 pt-1.5 max-h-[380px] overflow-y-auto pr-1">
                    {attendance.map((rec) => (
                      <div
                        key={rec.id}
                        className={`grid grid-cols-12 gap-2 py-2.5 items-center hover:bg-zinc-950/60 rounded-lg px-2 transition-colors border-b border-dashed border-zinc-850 last:border-none ${
                          editingRecord?.id === rec.id ? 'bg-indigo-950/20 border-indigo-900/40' : ''
                        }`}
                      >
                        {/* Date / Shift */}
                        <div className="col-span-3">
                          <p className="text-sm font-bold text-zinc-200">
                            {new Date(rec.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-[10px] text-zinc-500 flex items-center mt-0.5">
                            {rec.shiftType === 'day' ? (
                              <span className="flex items-center text-amber-400">
                                <Sun className="h-3 w-3 mr-0.5" /> Day
                              </span>
                            ) : (
                              <span className="flex items-center text-indigo-400 font-semibold">
                                <Moon className="h-3 w-3 mr-0.5" /> Night
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Times (Hours) */}
                        <div className="col-span-4 font-sans text-xs">
                          <p className="font-semibold text-zinc-350">
                            {formatTimeTo12Hour(rec.startTime)} - {formatTimeTo12Hour(rec.endTime)}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {rec.hoursWorked} Hours Worked
                          </p>
                        </div>

                        {/* Hourly Rate */}
                        <div className="col-span-2 text-right font-semibold text-zinc-400 text-xs">
                          {rec.hourlyRateApplied} ৳/h
                          {rec.bonusApplied > 0 && (
                            <span className="block text-[9px] text-indigo-400 font-bold">+{rec.bonusApplied} ৳</span>
                          )}
                        </div>

                        {/* Earned amount */}
                        <div className="col-span-2 text-right font-extrabold text-zinc-100 text-sm">
                          {rec.earnedAmount} ৳
                        </div>

                        {/* Edit & Delete Action */}
                        <div className="col-span-1 flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setEditingRecord(rec)}
                            className="p-1 text-zinc-500 hover:text-indigo-450 hover:bg-indigo-955/20 rounded-lg transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAttendance(rec.id)}
                            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-955/20 rounded-lg transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
                <p className="text-zinc-500 uppercase tracking-wider font-semibold font-sans">Day Hours Total</p>
                <p className="text-sm font-bold text-zinc-300 font-mono mt-0.5">{stats.dayHours} hrs</p>
              </div>
              <div>
                <p className="text-indigo-400 uppercase tracking-wider font-semibold font-sans">Night Hours Total</p>
                <p className="text-sm font-bold text-indigo-400 font-mono mt-0.5">{stats.nightHours} hrs</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'advance' && (
        <AdvanceRequestForm
          profile={profile}
          config={config}
          onSuccess={handleRefresh}
          refreshTrigger={refreshTrigger}
        />
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Analytics Header & Month Filter */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-100 font-sans mb-1 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-indigo-400" />
                Monthly Analytics & Report Engine
              </h2>
              <p className="text-xs text-zinc-400 font-sans">
                Interactive historical visual charts and formal pay-slip generator.
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-semibold text-zinc-400 font-sans">Report Month:</span>
              <div className="relative">
                <select
                  value={analyticsPeriod}
                  onChange={(e) => setAnalyticsPeriod(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-3 pr-8 text-xs font-bold text-zinc-300 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
                >
                  {getPeriodOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-500 w-0 h-0"></div>
              </div>
            </div>
          </div>

          {/* Visual Graphs Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Custom 6-Month Trajectory Chart */}
            <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 font-sans flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1.5 text-indigo-400" />
                    Salary Trajectory (6-Month Trend)
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                    Gross earnings compared with Net pay after advance deductions
                  </p>
                </div>
                {/* Chart Legends */}
                <div className="flex items-center space-x-3 text-[10px] font-sans">
                  <span className="flex items-center text-zinc-350">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 mr-1.5"></span>
                    Gross Earned
                  </span>
                  <span className="flex items-center text-zinc-350">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 mr-1.5"></span>
                    Net Received
                  </span>
                </div>
              </div>

              {/* Responsive SVG/HTML Bar Chart container */}
              <div className="h-[250px] flex flex-col justify-between pt-4">
                <div className="flex-1 flex items-end justify-between px-2 sm:px-6 relative">
                  {/* Grid background lines */}
                  <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-zinc-800/60 w-full h-0"></div>
                    <div className="border-b border-zinc-800/60 w-full h-0"></div>
                    <div className="border-b border-zinc-800/60 w-full h-0"></div>
                    <div className="border-b border-zinc-800/40 w-full h-0"></div>
                  </div>

                  {getMonthlyAnalytics().map((month) => {
                    const maxVal = Math.max(...getMonthlyAnalytics().map(m => m.earned), 1000);
                    const grossHeight = `${(month.earned / maxVal) * 100}%`;
                    const netHeight = `${(month.net / maxVal) * 100}%`;
                    const hasData = month.earned > 0;

                    return (
                      <div key={month.period} className="flex flex-col items-center flex-1 mx-2 sm:mx-4 group relative z-10">
                        {/* Hover values tooltip */}
                        <div className="absolute bottom-full mb-2 bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 shadow-xl text-center scale-0 group-hover:scale-100 transition-all origin-bottom duration-150 pointer-events-none z-30 min-w-[130px]">
                          <p className="text-[10px] font-bold text-zinc-400 font-sans">{month.label} Metrics</p>
                          <div className="border-t border-zinc-850 my-1"></div>
                          <p className="text-xs text-zinc-200 font-bold font-mono">Gross: {month.earned} ৳</p>
                          <p className="text-xs text-emerald-400 font-bold font-mono">Net: {month.net} ৳</p>
                          <p className="text-[9px] text-zinc-500 font-sans mt-0.5">{month.hours} Worked Hrs</p>
                        </div>

                        {/* Bar pillars */}
                        <div className="w-full flex justify-center items-end space-x-1 sm:space-x-2 h-[160px] relative">
                          {hasData ? (
                            <>
                              {/* Gross Salary Bar */}
                              <div
                                style={{ height: grossHeight }}
                                className="w-[12px] sm:w-[18px] bg-gradient-to-t from-indigo-700 to-indigo-500 rounded-t-md transition-all duration-500 shadow-md group-hover:brightness-110"
                              ></div>
                              {/* Net Salary Bar */}
                              <div
                                style={{ height: netHeight }}
                                className="w-[12px] sm:w-[18px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-500 shadow-md group-hover:brightness-110"
                              ></div>
                            </>
                          ) : (
                            <div className="h-2 w-4 bg-zinc-800/40 rounded-full"></div>
                          )}
                        </div>

                        {/* Month Label */}
                        <span className="text-[10px] font-bold text-zinc-400 mt-2 font-sans group-hover:text-zinc-200">
                          {month.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Shift Hour Distribution Ring/Meter */}
            <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-200 font-sans flex items-center mb-1">
                  <Clock className="h-4 w-4 mr-1.5 text-indigo-400" />
                  Shift Hours Allocation
                </h3>
                <p className="text-[10px] text-zinc-500 font-sans mb-6">
                  Day hours vs Night hours breakdown across all logged times
                </p>

                {allAttendance.length === 0 ? (
                  <div className="py-12 text-center text-zinc-600 text-xs font-sans">
                    No logged shifts found to analyze
                  </div>
                ) : (() => {
                  const totalDays = allAttendance.filter(r => r.status === 'approved' && r.shiftType === 'day').reduce((sum, r) => sum + r.hoursWorked, 0);
                  const totalNights = allAttendance.filter(r => r.status === 'approved' && r.shiftType === 'night').reduce((sum, r) => sum + r.hoursWorked, 0);
                  const overallSum = totalDays + totalNights || 1;
                  const dayPct = Math.round((totalDays / overallSum) * 100);
                  const nightPct = Math.round((totalNights / overallSum) * 100);

                  return (
                    <div className="space-y-6">
                      {/* Interactive Visual Bar Track */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold font-sans">
                          <span className="text-amber-400">Day shifts ({dayPct}%)</span>
                          <span className="text-indigo-400">Night shifts ({nightPct}%)</span>
                        </div>
                        <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800">
                          <div style={{ width: `${dayPct}%` }} className="bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"></div>
                          <div style={{ width: `${nightPct}%` }} className="bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"></div>
                        </div>
                      </div>

                      {/* Detail Metrics */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase font-sans">Day Hours</p>
                          <p className="text-base font-black text-amber-400 font-mono mt-0.5">{totalDays.toFixed(1)} hrs</p>
                          <span className="text-[9px] text-zinc-500 font-sans">Regular Day Shifts</span>
                        </div>
                        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase font-sans">Night Hours</p>
                          <p className="text-base font-black text-indigo-400 font-mono mt-0.5">{totalNights.toFixed(1)} hrs</p>
                          <span className="text-[9px] text-indigo-500 font-sans">Special Night Allowances</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="border-t border-zinc-800/80 pt-4 mt-4 text-[10px] text-zinc-500 leading-relaxed font-sans flex items-start space-x-1">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-zinc-400 shrink-0" />
                <span>Shift data is generated from logs approved in your local attendance sheet registry.</span>
              </div>
            </div>
          </div>

          {/* Payroll Invoice Report Receipt */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
              <div>
                <h3 className="text-base font-bold text-zinc-100 font-sans flex items-center">
                  <Receipt className="h-5 w-5 mr-2 text-indigo-400" />
                  Monthly Payroll Statement Receipt
                </h3>
                <p className="text-xs text-zinc-500 font-sans mt-0.5">
                  Generate formal payslips optimized for physical printouts or text exports.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={copyReportToClipboard}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl py-2 px-3.5 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  {copiedNotification ? (
                    <>
                      <ClipboardCheck className="h-4 w-4 text-emerald-400 animate-bounce" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-4 w-4" />
                      <span>Copy Text Receipt</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 px-4 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            {/* Receipt Stub */}
            {(() => {
              const data = getSelectedMonthReportData();
              const [year, month] = analyticsPeriod.split('-');
              const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
              const formattedMonth = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

              return (
                <div id="print-area" className="bg-zinc-950 rounded-2xl border border-zinc-850 p-6 md:p-8 space-y-6 relative overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none">
                  {/* Decorative Watermark background */}
                  <div className="absolute -right-16 -bottom-16 text-zinc-900/10 pointer-events-none text-9xl font-black font-mono select-none print:hidden">
                    PAYROLL
                  </div>

                  {/* Receipt Header */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-zinc-850 pb-6 gap-4 print:border-black">
                    <div className="space-y-1">
                      <div className="text-indigo-400 font-black text-sm uppercase tracking-widest print:text-black print:font-extrabold">
                        OFFLINE ATTENDANCE SYSTEM
                      </div>
                      <h4 className="text-xl font-black text-zinc-100 font-sans tracking-tight print:text-black">
                        Payroll Statement & Logs
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-mono print:text-black/60">
                        Registry Ref: OFF-PAY-LP-{year}-{month}
                      </p>
                    </div>

                    <div className="text-left md:text-right font-sans">
                      <span className="inline-block bg-indigo-600/10 text-indigo-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-500/20 print:bg-none print:border-black print:text-black">
                        Pay Period: {formattedMonth}
                      </span>
                      <p className="text-xs text-zinc-500 mt-2 font-mono print:text-black/60">
                        Date Compiled: {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Party Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border-b border-zinc-850 pb-6 print:border-black">
                    <div>
                      <p className="font-bold text-zinc-500 uppercase tracking-wider print:text-black">Employee Metadata</p>
                      <table className="mt-2 w-full text-zinc-300 print:text-black">
                        <tbody>
                          <tr>
                            <td className="py-1 text-zinc-500 pr-4 print:text-black/60">Full Name:</td>
                            <td className="py-1 font-bold text-zinc-200 print:text-black">{profile.name}</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-zinc-500 pr-4 print:text-black/60">Designation:</td>
                            <td className="py-1 font-semibold text-zinc-400 print:text-black">{profile.designation}</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-zinc-500 pr-4 print:text-black/60">Joined Date:</td>
                            <td className="py-1 font-mono text-zinc-400 print:text-black">{profile.joinedDate || 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <p className="font-bold text-zinc-500 uppercase tracking-wider print:text-black">Rate Configurations</p>
                      <table className="mt-2 w-full text-zinc-300 print:text-black">
                        <tbody>
                          <tr>
                            <td className="py-1 text-zinc-500 pr-4 print:text-black/60">Standard Rate:</td>
                            <td className="py-1 font-mono font-bold text-zinc-200 print:text-black">{profile.hourlyRate} ৳/hr</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-zinc-500 pr-4 print:text-black/60">Night Shift Base:</td>
                            <td className="py-1 font-mono text-zinc-400 print:text-black">{config.nightShiftBasicRate} ৳/hr</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-zinc-500 pr-4 print:text-black/60">Night Shift Allowance:</td>
                            <td className="py-1 font-mono text-zinc-400 print:text-black">+{config.nightShiftAllowance} ৳/shift</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Metric Blocks */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-850/50 print:bg-white print:border-black print:border">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider print:text-black/60">Hours Registered</p>
                      <p className="text-lg font-black text-zinc-150 font-mono mt-1 print:text-black">{data.totalHours} hrs</p>
                    </div>
                    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-850/50 print:bg-white print:border-black print:border">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider print:text-black/60">Gross Earnings</p>
                      <p className="text-lg font-black text-indigo-400 font-mono mt-1 print:text-black">{data.totalEarned} ৳</p>
                    </div>
                    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-850/50 print:bg-white print:border-black print:border">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider print:text-black/60">Salary Advances</p>
                      <p className="text-lg font-black text-amber-500 font-mono mt-1 print:text-black">{data.advanceTaken} ৳</p>
                    </div>
                    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-850/50 print:bg-white print:border-black print:border">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider print:text-black/60">Net Payable</p>
                      <p className="text-lg font-black text-emerald-400 font-mono mt-1 print:text-black">{data.netPayable} ৳</p>
                    </div>
                  </div>

                  {/* Attendance Log Table */}
                  <div className="space-y-3 pt-2">
                    <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest print:text-black">
                      Approved Attendance Log Summary
                    </h5>
                    {data.monthAtts.length === 0 ? (
                      <p className="text-xs text-zinc-600 font-sans italic print:text-black/60">No approved attendance entries found for this month.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-zinc-850 rounded-xl overflow-hidden print:border-black">
                          <thead className="bg-zinc-900 text-zinc-400 uppercase tracking-wider text-[10px] font-bold print:bg-white print:text-black print:border-b print:border-black">
                            <tr>
                              <th className="p-3">Date</th>
                              <th className="p-3">Shift Type</th>
                              <th className="p-3">Logged Interval</th>
                              <th className="p-3 text-right">Hours</th>
                              <th className="p-3 text-right">Earned Sum</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900 text-zinc-300 print:text-black print:divide-black">
                            {data.monthAtts.map((att) => (
                              <tr key={att.id} className="hover:bg-zinc-900/20 print:hover:bg-none">
                                <td className="p-3 font-medium font-mono">{new Date(att.date).toLocaleDateString()}</td>
                                <td className="p-3 font-semibold uppercase">{att.shiftType}</td>
                                <td className="p-3 font-mono text-zinc-400 print:text-black">{formatTimeTo12Hour(att.startTime)} - {formatTimeTo12Hour(att.endTime)}</td>
                                <td className="p-3 text-right font-mono">{att.hoursWorked} hrs</td>
                                <td className="p-3 text-right font-mono font-bold text-zinc-100 print:text-black">{att.earnedAmount} ৳</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Advances Log Table */}
                  {data.monthAdvs.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest print:text-black">
                        Salary Advances Deducted
                      </h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-zinc-850 rounded-xl overflow-hidden print:border-black">
                          <thead className="bg-zinc-900 text-zinc-400 uppercase tracking-wider text-[10px] font-bold print:bg-white print:text-black print:border-b print:border-black">
                            <tr>
                              <th className="p-3">Request Date</th>
                              <th className="p-3">Explanation / Reason</th>
                              <th className="p-3 text-right">Deduction Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900 text-zinc-300 print:text-black print:divide-black">
                            {data.monthAdvs.map((adv) => (
                              <tr key={adv.id} className="hover:bg-zinc-900/20 print:hover:bg-none">
                                <td className="p-3 font-mono">{new Date(adv.requestedAt).toLocaleDateString()}</td>
                                <td className="p-3 text-zinc-400 print:text-black italic">"{adv.reason}"</td>
                                <td className="p-3 text-right font-mono font-extrabold text-amber-500 print:text-black">-{adv.amount} ৳</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Signatures for Printouts */}
                  <div className="hidden print:grid grid-cols-2 gap-12 pt-16 text-xs text-center font-sans">
                    <div>
                      <div className="border-t border-black w-48 mx-auto mt-8"></div>
                      <p className="mt-2 font-bold">Employee Signature</p>
                      <p className="text-black/60">{profile.name}</p>
                    </div>
                    <div>
                      <div className="border-t border-black w-48 mx-auto mt-8"></div>
                      <p className="mt-2 font-bold">HR / Accounts Signature</p>
                      <p className="text-black/60">System Auto-Verified</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Update Settings & Rate History Details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-50 font-sans mb-1 flex items-center">
                <User className="h-5 w-5 mr-2 text-indigo-400" />
                Edit Profile settings
              </h3>
              <p className="text-xs text-zinc-500 font-sans mb-6">
                Change your active profile parameters and standard hourly rates.
              </p>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {profileSuccess && (
                  <div className="p-3.5 bg-emerald-955/20 border border-emerald-900/40 text-emerald-400 text-xs rounded-xl flex items-start space-x-2">
                    <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-3.5 bg-red-955/20 border border-red-900/40 text-red-400 text-xs rounded-xl flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-zinc-100 transition-colors"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    value={profileDesignation}
                    onChange={(e) => setProfileDesignation(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-zinc-100 transition-colors"
                    placeholder="e.g. Senior Officer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Standard Hourly Rate (৳/hr)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={profileRate}
                      onChange={(e) => setProfileRate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none rounded-xl py-2 pl-3 pr-10 text-sm text-zinc-100 font-mono transition-colors"
                      placeholder="e.g. 250"
                    />
                    <span className="absolute right-3 top-2.5 text-zinc-500 text-xs font-bold font-sans">
                      ৳/hr
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1 flex items-center">
                    <Moon className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                    Night Shift Basic Rate (৳/hr)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={nightBasicRate}
                      onChange={(e) => setNightBasicRate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none rounded-xl py-2 pl-3 pr-10 text-sm text-zinc-100 font-mono transition-colors"
                      placeholder="e.g. 70"
                    />
                    <span className="absolute right-3 top-2.5 text-zinc-500 text-xs font-bold font-sans">
                      ৳/hr
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1 flex items-center">
                    <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-400" />
                    Night Shift Announcement Bonus (৳/shift)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={nightAllowance}
                      onChange={(e) => setNightAllowance(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none rounded-xl py-2 pl-3 pr-10 text-sm text-zinc-100 font-mono transition-colors"
                      placeholder="e.g. 100"
                    />
                    <span className="absolute right-3 top-2.5 text-zinc-500 text-xs font-bold font-sans">
                      ৳/shift
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 font-semibold text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Save Profile Settings</span>
                </button>
              </form>
            </div>

            {/* Informative Rate Calculation Rules */}
            <div className="bg-zinc-900/50 border border-zinc-850 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center">
                <AlertCircle className="h-4 w-4 mr-1.5 text-amber-500" />
                Hourly Rate Locking Rules
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                To guarantee mathematical audit records, your hourly rate updates are <strong className="text-indigo-400 font-bold">non-retroactive</strong>:
              </p>
              <ul className="list-disc pl-4 text-xs text-zinc-400 space-y-1.5 font-sans">
                <li>
                  Any changes to your hourly rate apply only to <strong className="text-zinc-200">newly created</strong> attendance entries.
                </li>
                <li>
                  All previous calculations and historical approved hours are kept <strong className="text-zinc-200">permanently locked</strong> to the exact hourly rate applied on the day they were registered.
                </li>
                <li>
                  This allows you to change your rate at any date (e.g. after the 11th date of the month) without affecting previously generated tallies.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Reference Announcements & News Board */}
          <div className="lg:col-span-7 space-y-6">
            {/* Post New Announcement Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-50 font-sans mb-1 flex items-center">
                <Plus className="h-5 w-5 mr-1.5 text-indigo-400" />
                Post Announcement / Note
              </h3>
              <p className="text-xs text-zinc-500 font-sans mb-4">
                Add an announcement or note to save reference items on your board.
              </p>

              <form onSubmit={handleAddAnnouncement} className="space-y-3">
                <input
                  type="text"
                  placeholder="Announcement Title"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-zinc-100 transition-colors"
                  required
                />
                <textarea
                  placeholder="Announcement Content..."
                  value={newAnnContent}
                  onChange={(e) => setNewAnnContent(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-zinc-100 min-h-[80px] transition-colors"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Post Announcement</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Announcements Board */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-zinc-100 font-sans flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-indigo-400" />
                  Announcements Board
                </h3>
                <span className="text-[10px] bg-zinc-950 border border-zinc-800 text-zinc-500 px-2.5 py-1 rounded-full font-mono">
                  {announcements.length} Posts Saved
                </span>
              </div>

              {announcements.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <FileText className="h-10 w-10 text-zinc-800 mb-2" />
                  <p className="text-xs font-bold text-zinc-400 font-sans">No active announcements</p>
                  <p className="text-[10px] text-zinc-600 font-sans mt-0.5">Post an announcement to see it listed here.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-zinc-200 font-sans">
                          {ann.title}
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                          {ann.content}
                        </p>
                        <span className="block text-[9px] text-zinc-600 font-mono pt-1">
                          Posted on: {new Date(ann.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-955/20 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Delete Announcement"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
