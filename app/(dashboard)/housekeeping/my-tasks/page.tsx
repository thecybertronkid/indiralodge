'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Play,
  CheckCircle2,
  Wrench,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function HousekeeperMobileView() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);

  // Maintenance Reporting Modal State
  const [isMaintOpen, setIsMaintOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [maintForm, setMaintForm] = useState({
    category: 'AC',
    title: '',
    description: '',
    priority: 'HIGH',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/housekeeping/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      showToast('Failed to load assigned tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const handleStartTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/housekeeping/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to start task', 'error');
        return;
      }

      showToast('Cleaning started!', 'success');
      fetchMyTasks();
    } catch (e) {
      showToast('Error starting task', 'error');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/housekeeping/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to complete task', 'error');
        return;
      }

      showToast('Cleaning completed! Sent for supervisor inspection.', 'success');
      fetchMyTasks();
    } catch (e) {
      showToast('Error completing task', 'error');
    }
  };

  const handleReportMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/maintenance/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedTask.roomId,
          ...maintForm,
        }),
      });

      if (res.ok) {
        showToast(`Maintenance issue reported for Room ${selectedTask.room?.roomNumber}!`, 'success');
        setIsMaintOpen(false);
      } else {
        showToast('Failed to report issue', 'error');
      }
    } catch (e) {
      showToast('Error reporting issue', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Mobile Friendly Top Header */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <Link href="/housekeeping" className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-400" /> My Room Cleaning Tasks
            </h1>
            <p className="text-[11px] text-slate-400">Mobile Housekeeper Interface</p>
          </div>
        </div>

        <button onClick={fetchMyTasks} className="p-2 rounded-xl bg-slate-800 text-slate-300">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
          Loading assigned room tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="pmfs-card p-8 text-center text-xs text-slate-500">
          No room cleaning tasks assigned.
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((t) => {
            const isInProgress = t.status === 'IN_PROGRESS';
            const isCompleted = t.status === 'INSPECTION_REQUIRED' || t.status === 'READY';

            return (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border transition-all shadow-md ${
                  isInProgress
                    ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400'
                    : isCompleted
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-900">Room {t.room?.roomNumber}</span>
                  <Badge variant={t.priority === 'URGENT' ? 'error' : t.priority === 'HIGH' ? 'warning' : 'info'}>
                    {t.priority}
                  </Badge>
                </div>

                <div className="mt-2 text-xs space-y-1">
                  <div className="font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg w-fit">
                    {t.taskType.replace(/_/g, ' ')}
                  </div>
                  <div className="text-slate-600">Floor: <strong>{t.room?.floor}</strong> • Target: {t.estimatedDuration} mins</div>
                  {t.notes && <div className="text-slate-500 italic bg-slate-50 p-2 rounded-lg">{t.notes}</div>}
                </div>

                {/* Touch Actions */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col gap-2">
                  {!isInProgress && !isCompleted && (
                    <button
                      onClick={() => handleStartTask(t.id)}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Play className="w-5 h-5 fill-white" /> START CLEANING
                    </button>
                  )}

                  {isInProgress && (
                    <button
                      onClick={() => handleCompleteTask(t.id)}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-98"
                    >
                      <CheckCircle2 className="w-5 h-5" /> COMPLETE CLEANING
                    </button>
                  )}

                  {isCompleted && (
                    <div className="py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-100 rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Awaiting Supervisor Inspection
                    </div>
                  )}

                  {/* Report Maintenance Issue Button */}
                  <button
                    onClick={() => {
                      setSelectedTask(t);
                      setMaintForm({ category: 'AC', title: `Issue in Room ${t.room?.roomNumber}`, description: '', priority: 'HIGH' });
                      setIsMaintOpen(true);
                    }}
                    className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                  >
                    <Wrench className="w-4 h-4 text-amber-600" /> Report Maintenance Issue
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Report Maintenance Issue */}
      <Modal isOpen={isMaintOpen} onClose={() => setIsMaintOpen(false)} title={`Report Maintenance Issue: Room ${selectedTask?.room?.roomNumber}`} maxWidth="md">
        <form onSubmit={handleReportMaintenance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Issue Category *</label>
            <select
              value={maintForm.category}
              onChange={(e) => setMaintForm({ ...maintForm, category: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            >
              <option value="AC">Air Conditioner (AC)</option>
              <option value="PLUMBING">Plumbing / Leakage</option>
              <option value="ELECTRICAL">Electrical / Lighting</option>
              <option value="TELEVISION">Television / Set-top Box</option>
              <option value="DOOR_LOCK">Door Lock / Keycard</option>
              <option value="FURNITURE">Broken Furniture</option>
              <option value="OTHER">Other Issue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Brief Title *</label>
            <input
              type="text"
              required
              value={maintForm.title}
              onChange={(e) => setMaintForm({ ...maintForm, title: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Issue Description *</label>
            <textarea
              required
              rows={3}
              value={maintForm.description}
              onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
              placeholder="e.g. AC not cooling, leaking water on bathroom floor"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsMaintOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Submitting...' : 'Submit Maintenance Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
