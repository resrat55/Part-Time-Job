import React, { useState, useEffect } from 'react';
import { EmployeeProfile, AdvanceRequest, SystemConfig } from '../types';
import { submitAdvanceRequest, getEmployeeAdvanceRequests, deleteAdvanceRequest } from '../dbUtils';
import { Landmark, ArrowUpRight, HelpCircle, AlertCircle, History, Clock, CheckCircle2, XCircle, Trash2 } from 'lucide-react';

interface AdvanceRequestFormProps {
  profile: EmployeeProfile;
  config: SystemConfig;
  onSuccess: () => void;
  refreshTrigger: number;
}

export default function AdvanceRequestForm({ profile, config, onSuccess, refreshTrigger }: AdvanceRequestFormProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      const list = await getEmployeeAdvanceRequests(profile.uid, config.currentPayPeriod);
      setRequests(list);
    } catch (err) {
      console.error('Error fetching advances:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [profile.uid, config.currentPayPeriod, refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this advance request?')) {
      await deleteAdvanceRequest(id);
      onSuccess();
      await fetchRequests();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (!reason.trim()) {
      setError('Please explain why you need the advance.');
      return;
    }

    setLoading(true);
    try {
      const newRequest: Omit<AdvanceRequest, 'id'> = {
        employeeId: profile.uid,
        employeeName: profile.name,
        amount: amtNum,
        reason: reason.trim(),
        status: 'pending',
        payPeriod: config.currentPayPeriod,
        requestedAt: new Date().toISOString(),
      };

      await submitAdvanceRequest(newRequest);
      setSuccess('Advance request submitted successfully. Waiting for HR approval.');
      setAmount('');
      setReason('');
      onSuccess();
      await fetchRequests();
    } catch (err: any) {
      console.error(err);
      setError('Failed to submit advance request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Card */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-zinc-50 font-sans mb-4 flex items-center">
          <Landmark className="h-5 w-5 mr-2 text-indigo-400" />
          Request Advance Salary
        </h3>

        {error && (
          <div className="mb-4 bg-red-955/30 border border-red-900/50 text-red-400 p-3 rounded-xl text-xs flex items-start space-x-1.5 font-sans">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-emerald-955/30 border border-emerald-900/50 text-emerald-400 p-3 rounded-xl text-xs flex items-start space-x-1.5 font-sans">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Requested Amount (Taka / ৳)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-zinc-500 font-sans">৳</span>
              <input
                type="number"
                required
                min="100"
                step="50"
                placeholder="e.g. 2000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-7 pr-4 text-sm font-semibold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Advances will be subtracted from this month's running salary upon HR approval.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Reason / Usage Note
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explain the necessity (e.g. medical costs, rent, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 font-semibold text-sm shadow-sm transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Submitting...' : 'Request Advance'}</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* History Card */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-sm flex flex-col">
        <h3 className="text-lg font-bold text-zinc-50 font-sans mb-4 flex items-center">
          <History className="h-5 w-5 mr-2 text-zinc-400" />
          Current Period Requests
        </h3>

        <div className="flex-1 overflow-y-auto max-h-[280px] space-y-2.5 pr-1">
          {requests.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <HelpCircle className="h-8 w-8 text-zinc-700 mb-2" />
              <p className="text-xs font-semibold text-zinc-400">No advance requests yet</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Submit the form to request an advance</p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="border border-zinc-800 rounded-xl p-3 bg-zinc-950 hover:bg-zinc-900/60 transition-colors flex items-start justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-zinc-100">{req.amount} ৳</p>
                  <p className="text-xs text-zinc-400 italic">"{req.reason}"</p>
                  <p className="text-[10px] text-zinc-500">
                    Requested on: {new Date(req.requestedAt).toLocaleDateString()}
                  </p>
                  {req.processedBy && (
                    <p className="text-[10px] text-indigo-400 font-medium">
                      Processed by: {req.processedBy}
                    </p>
                  )}
                  {req.rejectionReason && (
                    <p className="text-[10px] text-red-400 font-medium italic bg-red-955/10 p-1 rounded border border-red-950/20">
                      Reason: {req.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-2 shrink-0">
                  <div>
                    {req.status === 'pending' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/30 text-amber-400 border border-amber-900/40 space-x-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>Pending</span>
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-955/30 text-emerald-400 border border-emerald-900/40 space-x-1">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>Approved</span>
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-955/30 text-red-400 border border-red-900/40 space-x-1">
                        <XCircle className="h-3 w-3 shrink-0" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(req.id)}
                    className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-955/20 rounded-lg transition-colors cursor-pointer"
                    title="Delete advance request"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
