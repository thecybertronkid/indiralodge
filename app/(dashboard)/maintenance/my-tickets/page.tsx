'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Play,
  CheckCircle2,
  MessageSquare,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Clock,
  Send,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function TechnicianMobileView() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);

  // Comment & Complete Modal States
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const [commentText, setCommentText] = useState('');
  const [completeForm, setCompleteForm] = useState({
    resolutionSummary: '',
    labourCost: '0',
    partsCost: '0',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchMyTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (e) {
      showToast('Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const handleStartWork = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/maintenance/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to start work', 'error');
        return;
      }

      showToast('Work started on ticket!', 'success');
      fetchMyTickets();
    } catch (e) {
      showToast('Error starting work', 'error');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !commentText.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/maintenance/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText }),
      });

      if (res.ok) {
        showToast('Comment added to ticket history!', 'success');
        setCommentText('');
        setIsCommentOpen(false);
        fetchMyTickets();
      } else {
        showToast('Failed to add comment', 'error');
      }
    } catch (e) {
      showToast('Error adding comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/maintenance/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          ...completeForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to complete repair', 'error');
        setSubmitting(false);
        return;
      }

      showToast('Repair marked complete! Sent for supervisor verification.', 'success');
      setIsCompleteOpen(false);
      fetchMyTickets();
    } catch (e) {
      showToast('Error completing repair', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Top Mobile Header */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <Link href="/maintenance" className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold tracking-tight flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" /> My Maintenance Tickets
            </h1>
            <p className="text-[11px] text-slate-400">Mobile Technician Interface</p>
          </div>
        </div>

        <button onClick={fetchMyTickets} className="p-2 rounded-xl bg-slate-800 text-slate-300">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
          Loading assigned work orders...
        </div>
      ) : tickets.length === 0 ? (
        <div className="pmfs-card p-8 text-center text-xs text-slate-500">
          No maintenance work orders assigned.
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => {
            const isInProgress = t.status === 'IN_PROGRESS';
            const isCompleted = t.status === 'VERIFICATION_REQUIRED' || t.status === 'RESOLVED';

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
                  <span className="text-lg font-extrabold text-slate-900">
                    {t.room?.roomNumber ? `Room ${t.room.roomNumber}` : t.asset?.name || 'Property Asset'}
                  </span>
                  <Badge variant={t.priority === 'CRITICAL' ? 'error' : t.priority === 'HIGH' ? 'warning' : 'info'}>
                    {t.priority}
                  </Badge>
                </div>

                <div className="mt-2 text-xs space-y-1">
                  <div className="font-bold text-slate-900 text-sm">{t.title}</div>
                  <div className="text-slate-600 font-mono text-[11px]">Ref: {t.ticketRef} • {t.category}</div>
                  <div className="text-slate-700 bg-slate-50 p-2 rounded-lg mt-1">{t.description}</div>
                </div>

                {/* Mobile Actions */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col gap-2">
                  {!isInProgress && !isCompleted && (
                    <button
                      onClick={() => handleStartWork(t.id)}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Play className="w-5 h-5 fill-white" /> START WORK
                    </button>
                  )}

                  {isInProgress && (
                    <button
                      onClick={() => {
                        setSelectedTicket(t);
                        setCompleteForm({ resolutionSummary: '', labourCost: '0', partsCost: '0' });
                        setIsCompleteOpen(true);
                      }}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-98"
                    >
                      <CheckCircle2 className="w-5 h-5" /> COMPLETE REPAIR
                    </button>
                  )}

                  {isCompleted && (
                    <div className="py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-100 rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Repair Complete • Pending Verification
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedTicket(t);
                      setIsCommentOpen(true);
                    }}
                    className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-brand-600" /> Add Work Log Comment
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Comment */}
      <Modal isOpen={isCommentOpen} onClose={() => setIsCommentOpen(false)} title={`Add Comment: ${selectedTicket?.ticketRef}`} maxWidth="md">
        <form onSubmit={handleAddComment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Technician Comment *</label>
            <textarea
              required
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="e.g. Cleaned AC filter, checked gas pressure"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCommentOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Post Comment
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Complete Repair */}
      <Modal isOpen={isCompleteOpen} onClose={() => setIsCompleteOpen(false)} title={`Complete Repair: ${selectedTicket?.ticketRef}`} maxWidth="md">
        <form onSubmit={handleCompleteRepair} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Resolution Summary *</label>
            <input
              type="text"
              required
              value={completeForm.resolutionSummary}
              onChange={(e) => setCompleteForm({ ...completeForm, resolutionSummary: e.target.value })}
              placeholder="e.g. Replaced leaking valve and tested pressure"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Labour Cost (₹)</label>
              <input
                type="number"
                value={completeForm.labourCost}
                onChange={(e) => setCompleteForm({ ...completeForm, labourCost: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Parts Cost (₹)</label>
              <input
                type="number"
                value={completeForm.partsCost}
                onChange={(e) => setCompleteForm({ ...completeForm, partsCost: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCompleteOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              {submitting ? 'Completing...' : 'Mark Repair Complete'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
