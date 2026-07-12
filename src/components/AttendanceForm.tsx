import React, { useState, useEffect } from 'react';
import { AttendanceRecord, EmployeeProfile, SystemConfig, ShiftType } from '../types';
import { addAttendanceRecord, updateAttendanceRecord } from '../dbUtils';
import { Calendar, Clock, Sparkles, Moon, Sun, AlertCircle, RefreshCw, X } from 'lucide-react';

interface AttendanceFormProps {
  profile: EmployeeProfile;
  config: SystemConfig;
  onSuccess: () => void;
  editingRecord?: AttendanceRecord | null;
  onCancelEdit?: () => void;
}

export default function AttendanceForm({
  profile,
  config,
  onSuccess,
  editingRecord,
  onCancelEdit
}: AttendanceFormProps) {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  
  // Start Time 12-hour components (Default: 9:00 PM)
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [startAmpm, setStartAmpm] = useState<'AM' | 'PM'>('PM');

  // End Time 12-hour components (Default: 3:00 AM)
  const [endHour, setEndHour] = useState(3);
  const [endMinute, setEndMinute] = useState(0);
  const [endAmpm, setEndAmpm] = useState<'AM' | 'PM'>('AM');

  const [shiftType, setShiftType] = useState<ShiftType>('night');
  const [lastTimeKey, setLastTimeKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoursWorked, setHoursWorked] = useState(6);
  const [predictedEarnings, setPredictedEarnings] = useState(0);

  // Helper to parse 24h time ("HH:mm") into 12h components
  const parse24To12 = (time24: string) => {
    const [hStr, mStr] = time24.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return { hour: hour12, minute: m, ampm };
  };

  // Helper to convert 12h components to 24h string ("HH:mm")
  const getHour24 = (h12: number, ampm: 'AM' | 'PM'): number => {
    if (h12 === 12) {
      return ampm === 'AM' ? 0 : 12;
    }
    return ampm === 'PM' ? h12 + 12 : h12;
  };

  const format12To24 = (h12: number, min: number, ampm: 'AM' | 'PM'): string => {
    const h24 = getHour24(h12, ampm);
    return `${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  const currentTimeKey = `${startHour}:${startMinute}:${startAmpm}-${endHour}:${endMinute}:${endAmpm}`;

  // Synchronize when editingRecord is supplied or cleared
  useEffect(() => {
    if (editingRecord) {
      setDate(editingRecord.date);
      const start = parse24To12(editingRecord.startTime);
      setStartHour(start.hour);
      setStartMinute(start.minute);
      setStartAmpm(start.ampm as 'AM' | 'PM');

      const end = parse24To12(editingRecord.endTime);
      setEndHour(end.hour);
      setEndMinute(end.minute);
      setEndAmpm(end.ampm as 'AM' | 'PM');
      setShiftType(editingRecord.shiftType);
      const tempKey = `${start.hour}:${start.minute}:${start.ampm}-${end.hour}:${end.minute}:${end.ampm}`;
      setLastTimeKey(tempKey);
    } else {
      // Restore default 9:00 PM to 3:00 AM
      setDate(new Date().toISOString().substring(0, 10));
      setStartHour(9);
      setStartMinute(0);
      setStartAmpm('PM');
      setEndHour(3);
      setEndMinute(0);
      setEndAmpm('AM');
      setShiftType('night');
      setLastTimeKey('9:0:PM-3:0:AM');
    }
  }, [editingRecord]);

  // Automatic Shift Type & Hours calculation
  useEffect(() => {
    const start24Hour = getHour24(startHour, startAmpm);
    const end24Hour = getHour24(endHour, endAmpm);

    // Auto calculate shiftType ONLY IF the time components actually changed from previous computed key
    if (currentTimeKey !== lastTimeKey) {
      // Rule: "When ending time in 12 am to 7am . It automatically night shift . Else all are day shift."
      // 12:00 AM is 0h, 7:00 AM is 7h. Any hour in [0, 7] is night shift.
      const calculatedShift: ShiftType = (end24Hour >= 0 && end24Hour <= 7) ? 'night' : 'day';
      setShiftType(calculatedShift);
      setLastTimeKey(currentTimeKey);
    }

    // Calculate duration
    const startTotalMins = start24Hour * 60 + startMinute;
    let endTotalMins = end24Hour * 60 + endMinute;

    if (endTotalMins < startTotalMins) {
      endTotalMins += 24 * 60; // Next calendar day
    }

    const durationHrs = (endTotalMins - startTotalMins) / 60;
    const roundedHrs = parseFloat(durationHrs.toFixed(2));
    setHoursWorked(roundedHrs);
  }, [startHour, startMinute, startAmpm, endHour, endMinute, endAmpm, lastTimeKey]);

  // Separate useEffect to calculate predictedEarnings whenever hoursWorked OR shiftType changes
  useEffect(() => {
    let earnings = 0;
    if (shiftType === 'day') {
      earnings = hoursWorked * profile.hourlyRate;
    } else {
      earnings = hoursWorked * config.nightShiftBasicRate + config.nightShiftAllowance;
    }
    setPredictedEarnings(Math.round(earnings));
  }, [hoursWorked, shiftType, profile.hourlyRate, config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (hoursWorked <= 0) {
      setError('Shift duration must be greater than zero hours.');
      return;
    }

    setLoading(true);

    try {
      const payPeriod = date.substring(0, 7); // Format: "YYYY-MM"
      const startTimeStr = format12To24(startHour, startMinute, startAmpm);
      const endTimeStr = format12To24(endHour, endMinute, endAmpm);

      const recordData = {
        employeeId: profile.uid,
        employeeName: profile.name,
        date,
        startTime: startTimeStr,
        endTime: endTimeStr,
        hoursWorked,
        shiftType,
        status: 'approved' as const, // Approved automatically
        hourlyRateApplied: shiftType === 'day' ? profile.hourlyRate : config.nightShiftBasicRate,
        bonusApplied: shiftType === 'day' ? 0 : config.nightShiftAllowance,
        earnedAmount: predictedEarnings,
        payPeriod,
      };

      if (editingRecord) {
        // Edit existing record
        await updateAttendanceRecord(editingRecord.id, recordData);
        if (onCancelEdit) onCancelEdit();
      } else {
        // Add new record
        await addAttendanceRecord({
          ...recordData,
          createdAt: new Date().toISOString()
        });
      }

      onSuccess();

      // If not editing, keep defaults but clear any states
      if (!editingRecord) {
        setStartHour(9);
        setStartMinute(0);
        setStartAmpm('PM');
        setEndHour(3);
        setEndMinute(0);
        setEndAmpm('AM');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to save attendance log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Hours: 1 to 12
  const hoursOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  // Minutes: 0 to 59
  const minutesOptions = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className={`bg-zinc-900 rounded-2xl border p-6 shadow-sm transition-colors ${editingRecord ? 'border-indigo-500/50 shadow-indigo-950/20' : 'border-zinc-800'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-zinc-50 font-sans flex items-center">
          <Clock className="h-5 w-5 mr-2 text-indigo-400" />
          {editingRecord ? 'Edit Attendance Sheet' : 'Log Daily Attendance'}
        </h3>
        {editingRecord && (
          <button
            onClick={onCancelEdit}
            className="text-zinc-400 hover:text-zinc-200 bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Cancel Editing"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-955/30 border border-red-900/50 text-red-400 p-3 rounded-xl text-xs flex items-start space-x-1.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Work Date
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

        {/* Start Time Selectors (12 Hour Mode) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Shift Start Time (12-Hour Mode)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <select
                value={startHour}
                onChange={(e) => setStartHour(parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {hoursOptions.map((h) => (
                  <option key={h} value={h}>
                    {h} Hour
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={startMinute}
                onChange={(e) => setStartMinute(parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {minutesOptions.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')} Min
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={startAmpm}
                onChange={(e) => setStartAmpm(e.target.value as 'AM' | 'PM')}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer font-bold text-indigo-400"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>

        {/* End Time Selectors (12 Hour Mode) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Shift End Time (12-Hour Mode)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <select
                value={endHour}
                onChange={(e) => setEndHour(parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {hoursOptions.map((h) => (
                  <option key={h} value={h}>
                    {h} Hour
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={endMinute}
                onChange={(e) => setEndMinute(parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {minutesOptions.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')} Min
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={endAmpm}
                onChange={(e) => setEndAmpm(e.target.value as 'AM' | 'PM')}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer font-bold text-indigo-400"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>

        {/* Shift Type Selector (Auto Default with Manual Toggle Override) */}
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-850/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 font-sans uppercase tracking-wider">
              Shift Type
            </span>
            <span className="text-[10px] text-zinc-500 italic">
              Auto-detected, click to change manually
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShiftType('day')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                shiftType === 'day'
                  ? 'bg-amber-950/30 text-amber-400 border-amber-900/55'
                  : 'bg-zinc-900 text-zinc-500 border-transparent hover:bg-zinc-850 hover:text-zinc-300'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Day Shift</span>
            </button>
            <button
              type="button"
              onClick={() => setShiftType('night')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                shiftType === 'night'
                  ? 'bg-indigo-950/30 text-indigo-400 border-indigo-900/55'
                  : 'bg-zinc-900 text-zinc-500 border-transparent hover:bg-zinc-850 hover:text-zinc-300'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Night Shift</span>
            </button>
          </div>
        </div>

        {/* Dynamic Calculations Panel */}
        <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-850 flex justify-between items-center">
          <div>
            <p className="text-xs text-zinc-500 font-sans">Shift Duration</p>
            <p className="text-sm font-semibold text-zinc-200 font-sans mt-0.5">
              {hoursWorked} Hours
              <span className="text-xs font-normal text-zinc-500 block sm:inline sm:ml-1">
                ({shiftType === 'day' 
                  ? `${profile.hourlyRate} ৳/hr regular` 
                  : `${config.nightShiftBasicRate} ৳/hr + ${config.nightShiftAllowance} ৳ bonus`}
                )
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 font-sans">Earned Salary</p>
            <p className="text-lg font-extrabold text-indigo-400 font-sans flex items-center justify-end">
              <Sparkles className="h-4 w-4 mr-1 text-amber-500 shrink-0" />
              {predictedEarnings} ৳
            </p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="space-y-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 font-semibold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>Saving Shift...</span>
              </>
            ) : (
              <span>{editingRecord ? 'Update Attendance Record' : 'Save Attendance Sheet'}</span>
            )}
          </button>

          {editingRecord && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-full bg-transparent hover:bg-zinc-850 text-zinc-400 rounded-xl py-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
