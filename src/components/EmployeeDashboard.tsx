import React, { useState, useEffect } from 'react';
import { EmployeeProfile, AttendanceRecord, SystemConfig, Announcement } from '../types';
import {
  getEmployeeAttendance,
  deleteAttendanceRecord,
  updateEmployeeProfileFields,
  getAnnouncements,
  addAnnouncement,
  deleteAnnouncement
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
  AlertCircle
} from 'lucide-react';

interface EmployeeDashboardProps {
  profile: EmployeeProfile;
  config: SystemConfig;
  onLogout: () => void;
  onProfileUpdate: () => void;
}

export default function EmployeeDashboard({ profile, config, onLogout, onProfileUpdate }: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'advance' | 'profile'>('overview');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(config.currentPayPeriod);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Profile Form States
  const [profileName, setProfileName] = useState(profile.name);
  const [profileDesignation, setProfileDesignation] = useState(profile.designation);
  const [profileRate, setProfileRate] = useState(profile.hourlyRate.toString());
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Announcements States
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');

  // Sync profile state variables if parent profile updates
  useEffect(() => {
    setProfileName(profile.name);
    setProfileDesignation(profile.designation);
    setProfileRate(profile.hourlyRate.toString());
  }, [profile]);

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
      setProfileSuccess(`Your profile settings and hourly rate have been saved successfully! Future attendance logs will use the new rate of ${parsedRate} ৳/hr.`);
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
                    Hourly Rate (৳/hr)
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
