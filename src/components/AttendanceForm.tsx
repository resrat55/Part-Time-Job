import React, { useState, useEffect } from 'react';
import { AttendanceRecord, EmployeeProfile, SystemConfig, ShiftType } from '../types';
import { addAttendanceRecord } from '../dbUtils';
import { Calendar, Clock, Sparkles, Moon, Sun, AlertCircle } from 'lucide-react';

interface AttendanceFormProps {
  profile: EmployeeProfile;
  config: SystemConfig;
  onSuccess: () => void;
}

export default function AttendanceForm({ profile, config, onSuccess }: AttendanceFormProps) {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [shiftType, setShiftType] = useState<ShiftType>('day');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoursWorked, setHoursWorked] = useState(8);
  const [predictedEarnings, setPredictedEarnings] = useState(0);

  // Recalculate hours and predicted earnings on input change
  useEffect(() => {
    if (!startTime || !endTime) return;

    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      
      let startMins = sh * 60 + sm;
      let endMins = eh * 60 + em;
      
      if (endMins < startMins) {
        endMins += 24 * 60; // Crosses midnight
      }
      
      const hours = (endMins - startMins) / 60;
      setHoursWorked(parseFloat(hours.toFixed(2)));

      let earnings = 0;
      if (shiftType === 'day') {
        earnings = hours * profile.hourlyRate;
      } else {
        earnings = hours * config.nightShiftBasicRate + config.nightShiftAllowance;
      }
      setPredictedEarnings(Math.round(earnings));
    } catch (err) {
      console.error('Time parsing error', err);
    }
  }, [startTime, endTime, shiftType, profile.hourlyRate, config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) {
      setError('Please fill in all the attendance details.');
      return;
    }

    if (hoursWorked <= 0) {
      setError('Invalid shift duration.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payPeriod = date.substring(0, 7); // Format: "YYYY-MM"
      const record: Omit<AttendanceRecord, 'id'> = {
        employeeId: profile.uid,
        employeeName: profile.name,
        date,
        startTime,
        endTime,
        hoursWorked,
        shiftType,
        status: 'approved', // Automatically active for simplicity but editable by HR
        hourlyRateApplied: shiftType === 'day' ? profile.hourlyRate : config.nightShiftBasicRate,
        bonusApplied: shiftType === 'day' ? 0 : config.nightShiftAllowance,
        earnedAmount: predictedEarnings,
        payPeriod,
        createdAt: new Date().toISOString(),
      };

      await addAttendanceRecord(record);
      onSuccess();
      // Reset form slightly but keep date
      setStartTime('09:00');
      setEndTime('17:00');
      setShiftType('day');
    } catch (err: any) {
      console.error(err);
      setError('Failed to submit attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-zinc-50 font-sans mb-4 flex items-center">
        <Clock className="h-5 w-5 mr-2 text-indigo-400" />
        Note Down Attendance
      </h3>

      {error && (
        <div className="mb-4 bg-red-955/30 border border-red-900/50 text-red-400 p-3 rounded-xl text-xs flex items-start space-x-1.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Shift Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Select Shift Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShiftType('day')}
                className={`py-2 px-3 border rounded-xl text-sm font-medium flex items-center justify-center space-x-1.5 transition-all ${
                  shiftType === 'day'
                    ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400'
                    : 'border-zinc-800 text-zinc-400 bg-zinc-950 hover:bg-zinc-900'
                }`}
              >
                <Sun className="h-4 w-4" />
                <span>Day Shift</span>
              </button>
              <button
                type="button"
                onClick={() => setShiftType('night')}
                className={`py-2 px-3 border rounded-xl text-sm font-medium flex items-center justify-center space-x-1.5 transition-all ${
                  shiftType === 'night'
                    ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400'
                    : 'border-zinc-800 text-zinc-400 bg-zinc-950 hover:bg-zinc-900'
                }`}
              >
                <Moon className="h-4 w-4" />
                <span>Night Shift</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Start Time
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              End Time
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-850 flex justify-between items-center">
          <div>
            <p className="text-xs text-zinc-500 font-sans">Duration & Rate Mode</p>
            <p className="text-sm font-semibold text-zinc-200 font-sans mt-0.5">
              {hoursWorked} Hours
              <span className="text-xs font-normal text-zinc-500 ml-1">
                ({shiftType === 'day' 
                  ? `${profile.hourlyRate} ৳/hr regular` 
                  : `${config.nightShiftBasicRate} ৳/hr + ${config.nightShiftAllowance} ৳ bonus`}
                )
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 font-sans">Est. Earnings</p>
            <p className="text-lg font-extrabold text-indigo-400 font-sans flex items-center justify-end">
              <Sparkles className="h-4 w-4 mr-1 text-amber-500 shrink-0" />
              {predictedEarnings} ৳
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 font-semibold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Saving Attendance...' : 'Save Attendance'}
        </button>
      </form>
    </div>
  );
}
