import React, { useState } from 'react';
import { motion } from 'motion/react';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import {
  getEmployeeProfile,
  saveEmployeeProfile,
  seedDemoDataForEmployee,
  ensureSystemConfig
} from '../dbUtils';
import { UserRole } from '../types';
import { KeyRound, Mail, User, Briefcase, DollarSign, Shield, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (uid: string) => void;
  onLocalLoginSuccess: (uid: string) => void;
}

export default function Login({ onLoginSuccess, onLocalLoginSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [designation, setDesignation] = useState('');
  const [hourlyRate, setHourlyRate] = useState('150');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConsoleAlert, setShowConsoleAlert] = useState(false);
  const [pendingDemoUser, setPendingDemoUser] = useState<any>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in email and password.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name) {
          setError('Please provide a name.');
          setLoading(false);
          return;
        }
        // Register standard
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const rateNum = parseFloat(hourlyRate) || 150;
        
        const profile = {
          uid: userCred.user.uid,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role,
          hourlyRate: role === 'hr' ? 0 : rateNum,
          designation: role === 'hr' ? 'HR / Manager' : (designation.trim() || 'Staff'),
          joinedDate: new Date().toISOString().substring(0, 10),
          createdAt: new Date().toISOString(),
        };

        await saveEmployeeProfile(profile);
        await ensureSystemConfig();

        if (role === 'employee') {
          const currentPeriod = new Date().toISOString().substring(0, 7);
          await seedDemoDataForEmployee(userCred.user.uid, profile.name, currentPeriod, rateNum);
        }

        onLoginSuccess(userCred.user.uid);
      } else {
        // Sign in standard
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        onLoginSuccess(userCred.user.uid);
      }
    } catch (err: any) {
      console.error(err);
      const isOfflineError = err.message?.toLowerCase().includes('offline') || 
                            err.message?.toLowerCase().includes('could not reach') || 
                            err.message?.toLowerCase().includes('failed to get document') ||
                            err.message?.toLowerCase().includes('network-request-failed') ||
                            err.code === 'unavailable';
      if (isOfflineError) {
        setError('Firebase appears to be offline. Auto-launching Local Offline Mode for you...');
        setTimeout(() => {
          enterLocalDemoMode({
            role: role,
            email: email.trim() || 'user@office.com',
            name: name.trim() || (role === 'hr' ? 'Manager HR' : 'Standard Employee'),
            designation: designation.trim() || (role === 'hr' ? 'HR Manager' : 'Specialist'),
            rate: parseFloat(hourlyRate) || 150
          });
        }, 1500);
      } else if (err.code === 'auth/operation-not-allowed') {
        setPendingDemoUser({
          role: role,
          email: email.trim(),
          name: name.trim() || 'Standard Employee',
          designation: designation.trim() || 'Staff',
          rate: parseFloat(hourlyRate) || 150
        });
        setShowConsoleAlert(true);
      } else {
        setError(err.message || 'Authentication failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loginDemoAccount = async (demoRole: UserRole, demoEmail: string, demoName: string, demoDesignation: string, demoRate: number) => {
    setError('');
    setLoading(true);
    const demoPassword = 'password123';

    try {
      // 1. Ensure config exists first
      await ensureSystemConfig();

      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      } catch (signInErr: any) {
        // If account doesn't exist, create it
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          userCred = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        } else {
          throw signInErr;
        }
      }

      // 2. Double check / save profile
      const existingProfile = await getEmployeeProfile(userCred.user.uid);
      if (!existingProfile) {
        const profile = {
          uid: userCred.user.uid,
          name: demoName,
          email: demoEmail,
          role: demoRole,
          hourlyRate: demoRate,
          designation: demoDesignation,
          joinedDate: '2026-01-15',
          createdAt: new Date().toISOString(),
        };
        await saveEmployeeProfile(profile);
      }

      // 3. Seed some nice dynamic demonstration data for employee roles
      if (demoRole === 'employee') {
        const currentPeriod = new Date().toISOString().substring(0, 7);
        await seedDemoDataForEmployee(userCred.user.uid, demoName, currentPeriod, demoRate);
      }

      onLoginSuccess(userCred.user.uid);
    } catch (err: any) {
      console.error('Demo login error', err);
      const isOfflineError = err.message?.toLowerCase().includes('offline') || 
                            err.message?.toLowerCase().includes('could not reach') || 
                            err.message?.toLowerCase().includes('failed to get document') ||
                            err.message?.toLowerCase().includes('network-request-failed') ||
                            err.code === 'unavailable';
      if (isOfflineError) {
        setError(`Firebase is offline. Auto-launching Local Offline Mode as ${demoName}...`);
        setTimeout(() => {
          enterLocalDemoMode({
            role: demoRole,
            email: demoEmail,
            name: demoName,
            designation: demoDesignation,
            rate: demoRate
          });
        }, 1500);
      } else if (err.code === 'auth/operation-not-allowed') {
        setPendingDemoUser({
          role: demoRole,
          email: demoEmail,
          name: demoName,
          designation: demoDesignation,
          rate: demoRate
        });
        setShowConsoleAlert(true);
      } else {
        setError(`Failed to set up demo user: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const enterLocalDemoMode = async (customUser?: any) => {
    setShowConsoleAlert(false);
    setLoading(true);
    try {
      const u = customUser || pendingDemoUser || {
        role: 'hr',
        email: 'hr@office.com',
        name: 'Manager HR',
        designation: 'HR / Manager',
        rate: 0
      };
      
      // Save local mode flag
      localStorage.setItem('attendance_local_mode', 'true');
      
      const localUid = `local_${u.role}_${Date.now()}`;
      const localUserData = {
        uid: localUid,
        email: u.email,
        displayName: u.name,
      };
      
      // Save local user session
      localStorage.setItem('attendance_local_user', JSON.stringify(localUserData));
      
      // Initialize local database structures
      await ensureSystemConfig();
      
      // Save local user profile
      const profile = {
        uid: localUid,
        name: u.name,
        email: u.email,
        role: u.role,
        hourlyRate: u.rate,
        designation: u.designation,
        joinedDate: new Date().toISOString().substring(0, 10),
        createdAt: new Date().toISOString(),
      };
      await saveEmployeeProfile(profile);
      
      // Seed local demo data if employee
      if (u.role === 'employee') {
        const currentPeriod = new Date().toISOString().substring(0, 7);
        await seedDemoDataForEmployee(localUid, u.name, currentPeriod, u.rate);
      }
      
      // Notify parent
      onLocalLoginSuccess(localUid);
    } catch (err: any) {
      setError(`Failed to start local demo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      
      {/* Firebase console instructional alert modal */}
      {showConsoleAlert && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-zinc-850 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
          >
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Firebase Setup Warning
            </h3>
            <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
              The <strong>Email/Password sign-in provider</strong> is not yet enabled in your Firebase project console.
            </p>
            
            <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl mb-4 space-y-2 text-left">
              <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">How to enable it:</p>
              <ol className="text-xs text-zinc-400 list-decimal pl-4 space-y-1.5 leading-relaxed">
                <li>Navigate to your <strong className="text-indigo-400">Firebase Console</strong>.</li>
                <li>Go to <strong className="text-zinc-300">Authentication</strong> &gt; <strong className="text-zinc-300">Sign-in method</strong>.</li>
                <li>Click <strong className="text-zinc-300">Add new provider</strong>, select <strong className="text-indigo-400">Email/Password</strong>, toggle it to <strong className="text-zinc-300">Enable</strong>, and click <strong className="text-zinc-300">Save</strong>.</li>
              </ol>
            </div>

            <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
              Alternatively, switch to Local Offline Demo Mode to instantly bypass Firebase configuration and test all features immediately in your browser cache.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => enterLocalDemoMode()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 px-4 font-semibold text-sm shadow-sm transition-all text-center cursor-pointer"
              >
                Enter Local Demo Mode
              </button>
              <button
                type="button"
                onClick={() => setShowConsoleAlert(false)}
                className="border border-zinc-800 hover:bg-zinc-950 text-zinc-400 rounded-xl py-2.5 px-4 font-medium text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Briefcase className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-zinc-50 font-sans">
          WorkHour Tracker
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400 font-sans">
          Note down attendance, view running salaries & manage advances
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 py-8 px-4 border border-zinc-800 rounded-2xl sm:px-10"
        >
          {error && (
            <div className="mb-4 bg-red-950/30 border border-red-900/50 text-red-400 p-3 rounded-lg text-sm font-sans">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleAuth}>
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Reyad Sorker"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-zinc-955 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Select Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('employee')}
                      className={`py-2 px-3 border rounded-xl text-sm font-medium flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                        role === 'employee'
                          ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400 shadow-sm'
                          : 'border-zinc-800 text-zinc-400 bg-zinc-950 hover:bg-zinc-900'
                      }`}
                    >
                      <User className="h-4 w-4" />
                      <span>Employee</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('hr')}
                      className={`py-2 px-3 border rounded-xl text-sm font-medium flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                        role === 'hr'
                          ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400 shadow-sm'
                          : 'border-zinc-800 text-zinc-400 bg-zinc-950 hover:bg-zinc-900'
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      <span>HR Manager</span>
                    </button>
                  </div>
                </div>

                {role === 'employee' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sales Executive"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="w-full bg-zinc-955 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Hourly Rate (Taka)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                        <input
                          type="number"
                          min="1"
                          placeholder="Rate"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          className="w-full bg-zinc-955 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-955 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-955 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 font-semibold text-sm shadow-sm transition-all flex items-center justify-center space-x-1 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-xs text-indigo-400 font-semibold hover:underline bg-transparent border-none cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'New Employee? Register Profile'}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-850"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-zinc-900 text-zinc-500 font-sans">Quick-Start Test Profiles</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => loginDemoAccount('hr', 'hr@office.com', 'Manager HR', 'HR / Manager', 0)}
              disabled={loading}
              className="w-full border border-zinc-800 hover:bg-zinc-950 flex items-center justify-between p-3 rounded-xl transition-all hover:border-indigo-500/30 group text-left cursor-pointer"
            >
              <div>
                <p className="text-xs font-semibold text-indigo-400 flex items-center space-x-1">
                  <Shield className="h-3.5 w-3.5 mr-1" /> Manager Role
                </p>
                <p className="text-xs text-zinc-500 font-mono">hr@office.com</p>
              </div>
              <span className="text-xs text-zinc-400 group-hover:text-indigo-400 font-medium flex items-center">
                Use HR <ArrowRight className="h-3 w-3 ml-1" />
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => loginDemoAccount('employee', 'reyad@office.com', 'Reyad Sorker', 'Sales Specialist', 150)}
                disabled={loading}
                className="border border-zinc-800 hover:bg-zinc-950 p-2.5 rounded-xl transition-all text-left group hover:border-indigo-500/30 cursor-pointer"
              >
                <p className="text-xs font-semibold text-zinc-300 flex items-center space-x-1">
                  <User className="h-3.5 w-3.5 mr-1 text-zinc-500" /> Employee 1
                </p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">reyad@office.com</p>
                <p className="text-[10px] text-zinc-400 mt-1">Rate: 150 ৳/hr</p>
              </button>

              <button
                onClick={() => loginDemoAccount('employee', 'sarah@office.com', 'Sarah Smith', 'Operations Assistant', 120)}
                disabled={loading}
                className="border border-zinc-800 hover:bg-zinc-950 p-2.5 rounded-xl transition-all text-left group hover:border-indigo-500/30 cursor-pointer"
              >
                <p className="text-xs font-semibold text-zinc-300 flex items-center space-x-1">
                  <User className="h-3.5 w-3.5 mr-1 text-zinc-500" /> Employee 2
                </p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">sarah@office.com</p>
                <p className="text-[10px] text-zinc-400 mt-1">Rate: 120 ৳/hr</p>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-zinc-850/60 text-center">
            <button
              onClick={() => enterLocalDemoMode()}
              disabled={loading}
              className="text-xs text-zinc-400 hover:text-indigo-400 font-semibold transition-colors hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
            >
              <span>⚡ Bypass and Launch Offline Local Mode</span>
            </button>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
