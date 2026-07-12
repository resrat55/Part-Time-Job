import React, { useState, useEffect } from 'react';
import { getEmployeeProfile, getSystemConfig, ensureSystemConfig } from './dbUtils';
import { EmployeeProfile, SystemConfig } from './types';
import Login from './components/Login';
import EmployeeDashboard from './components/EmployeeDashboard';
import { Loader2, Sparkles, Building2 } from 'lucide-react';

export default function App() {
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
    const activeUid = localUser?.uid;
    if (activeUid) {
      setLoading(true);
      loadConfigAndProfile(activeUid).finally(() => setLoading(false));
    } else {
      // Just load config in background to be ready
      getSystemConfig().then(cfg => setConfig(cfg)).catch(err => console.error(err));
      setLoading(false);
    }
  }, [localUser, refreshTrigger]);

  const handleLoginSuccess = async (uid: string) => {
    const savedLocalUser = localStorage.getItem('attendance_local_user');
    if (savedLocalUser) {
      setLocalUser(JSON.parse(savedLocalUser));
    }
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('attendance_local_user');
      setLocalUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin mb-4" />
        <p className="text-sm font-semibold text-zinc-400">Loading Offline System...</p>
      </div>
    );
  }

  if (!localUser || !profile || !config) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onLocalLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
      {/* Top Banner Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>

      {/* Main Container */}
      <main className="flex-1">
        <EmployeeDashboard
          profile={profile}
          config={config}
          onLogout={handleLogout}
          onProfileUpdate={() => setRefreshTrigger((prev) => prev + 1)}
        />
      </main>

      {/* Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-800 py-6 text-center text-xs text-zinc-500 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="flex items-center text-zinc-400">
            <Building2 className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
            Attendance and Salary Registry Portal (Netlify Edition)
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
