import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  localSignIn,
  localSignUp,
  ensureSystemConfig
} from '../dbUtils';
import { UserRole } from '../types';
import { KeyRound, Mail, User, Briefcase, DollarSign, ArrowRight, Sparkles } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (uid: string) => void;
  onLocalLoginSuccess: (uid: string) => void;
}

export default function Login({ onLoginSuccess, onLocalLoginSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [hourlyRate, setHourlyRate] = useState('150');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        const rateNum = parseFloat(hourlyRate) || 150;
        const profile = await localSignUp(
          email.trim(),
          password,
          name.trim(),
          'employee', // Always registered as employee now
          designation.trim() || 'Specialist',
          rateNum
        );
        onLocalLoginSuccess(profile.uid);
      } else {
        const profile = await localSignIn(email.trim(), password);
        onLocalLoginSuccess(profile.uid);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Briefcase className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-extrabold text-zinc-100 tracking-tight font-sans">
          {isSignUp ? 'Create Employee Profile' : 'Employee Sign In'}
        </h2>
        <p className="mt-2 text-center text-xs text-zinc-400 font-sans flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
          Offline Local Registry • Runs completely in browser
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          layout
          className="bg-zinc-900 py-8 px-4 border border-zinc-850/60 shadow-2xl rounded-2xl sm:px-10"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-955/40 border border-red-900/50 text-red-400 rounded-xl text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Specialist"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full bg-zinc-955 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Hourly Rate (৳)
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
        </motion.div>
      </div>
    </div>
  );
}
