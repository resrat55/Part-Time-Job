import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getEmployeeProfile, getSystemConfig, ensureSystemConfig, isLocalMode } from './dbUtils';
import { EmployeeProfile, SystemConfig } from './types';
import Login from './components/Login';
import EmployeeDashboard from './components/EmployeeDashboard';
import HRDashboard from './components/HRDashboard';
import { Briefcase, Loader2, Sparkles, Building2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [localUser, setLocalUser] = useState<any>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Restore local user session on mount
  useEffect(() => {
    const savedLocalUser = localStorage.getItem('attendance_local_user');
    if (savedLocalUser) {
      try {
        const parsed = JSON.parse(savedLocalUser);
        setLocalUser(parsed);
      } catch (err) {
        console.error('Error parsing local user session:', err);
      }
    }
  }, []);

  // Initialize and load system configuration and user profile
  const loadConfigAndProfile = async (uid: string) => {
    try {
      await ensureSystemConfig();
      const globalConfig = await getSystemConfig();
      setConfig(globalConfig);
      const userProfile = await getEmployeeProfile(uid);
      setProfile(userProfile);
    } catch (err) {
      console.error('Error loading config/profile:', err);
    }
  };

  useEffect(() => {
    const activeUid = user?.uid || localUser?.uid;
    if (activeUid) {
      setLoading(true);
      loadConfigAndProfile(activeUid).finally(() => setLoading(false));
    } else {
      // Just load config in background to be ready
      getSystemConfig().then(cfg => setConfig(cfg)).catch(err => console.error(err));
      setLoading(false);
    }
  }, [user, localUser, refreshTrigger]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = async (uid: string) => {
    localStorage.removeItem('attendance_local_mode');
    localStorage.removeItem('attendance_local_user');
    setLocalUser(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLocalLoginSuccess = async (uid: string) => {
    const savedLocalUser = localStorage.getItem('attendance_local_user');
    if (savedLocalUser) {
      setLocalUser(JSON.parse(savedLocalUser));
    }
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('attendance_local_mode');
      localStorage.removeItem('attendance_local_user');
      setLocalUser(null);
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin mb-4" />
        <p className="text-sm font-semibold text-zinc-400">Securing Attendance System...</p>
      </div>
    );
  }

  const activeUser = user || localUser;
  if (!activeUser || !profile || !config) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onLocalLoginSuccess={handleLocalLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
      {/* Top Banner Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>

      {isLocalMode() && (
        <div className="bg-amber-950/40 border-b border-amber-900/40 px-4 py-2 text-center text-xs text-amber-300 font-sans flex items-center justify-center gap-2">
          <span>⚠️ <strong>Offline Local Demo Mode:</strong> Email/Password authentication is disabled in your Firebase console. All changes will be saved to your local browser storage.</span>
          <button 
            onClick={() => {
              localStorage.removeItem('attendance_local_mode');
              localStorage.removeItem('attendance_local_user');
              window.location.reload();
            }}
            className="underline hover:text-amber-100 font-semibold ml-2 cursor-pointer bg-transparent border-none"
          >
            Switch to Firebase
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1">
        {profile.role === 'hr' ? (
          <HRDashboard
            profile={profile}
            config={config}
            onLogout={handleLogout}
            onConfigChange={handleConfigChange}
          />
        ) : (
          <EmployeeDashboard
            profile={profile}
            config={config}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-800 py-6 text-center text-xs text-zinc-500 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="flex items-center text-zinc-400">
            <Building2 className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
            Attendance and Salary Registry Portal
          </p>
          <p className="flex items-center font-semibold text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
            Calculated Automatically in ৳ (Taka)
          </p>
        </div>
      </footer>
    </div>
  );
}
