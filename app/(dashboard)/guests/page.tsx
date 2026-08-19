'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Star,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function GuestsPage() {
  const { showToast } = useToast();
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [possibleDuplicates, setPossibleDuplicates] = useState<any[]>([]);

  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'Male',
    phone: '',
    email: '',
    city: '',
    state: '',
    country: 'India',
    company: '',
    gstin: '',
    guestType: 'INDIVIDUAL',
    notes: '',
  });

  const [saving, setSaving] = useState(false);

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const url = `/api/guests?search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setGuests(data.guests || []);
      }
    } catch (e) {
      showToast('Failed to load guest directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, [search]);

  const handleCreateCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. First run duplicate detection check
      const checkRes = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, duplicateCheckOnly: true }),
      });

      const checkData = await checkRes.json();
      if (checkData.hasDuplicates && checkData.possibleDuplicates?.length > 0) {
        setPossibleDuplicates(checkData.possibleDuplicates);
        setIsDuplicateOpen(true);
        setSaving(false);
        return;
      }

      // 2. If no duplicates, submit guest creation directly
      await submitNewGuest();
    } catch (e) {
      showToast('Error during guest creation', 'error');
      setSaving(false);
    }
  };

  const submitNewGuest = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, duplicateCheckOnly: false }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create guest profile', 'error');
        setSaving(false);
        return;
      }

      showToast(`Guest profile created for ${data.guest.displayName}`, 'success');
      setIsAddOpen(false);
      setIsDuplicateOpen(false);
      fetchGuests();
    } catch (e) {
      showToast('Error creating guest profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-brand-600" />
            Guest Directory & Master Profiles
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized guest master database, stay histories, VIP badges, and government KYC documents
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Create Guest Profile
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="pmfs-card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest name, phone, email, ref code, company..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          onClick={fetchGuests}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          title="Refresh directory"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Guest Data Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Guest Ref</th>
                <th className="pmfs-table-th">Guest Name</th>
                <th className="pmfs-table-th">Phone & Contact</th>
                <th className="pmfs-table-th">City / Country</th>
                <th className="pmfs-table-th">Guest Type</th>
                <th className="pmfs-table-th">Total Stays</th>
                <th className="pmfs-table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    Loading guest directory...
                  </td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-slate-500">
                    No guest profiles found matching your search.
                  </td>
                </tr>
              ) : (
                guests.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                    <td className="pmfs-table-td font-mono font-bold text-brand-700">
                      <Link href={`/guests/${g.id}`} className="hover:underline">
                        {g.guestRef}
                      </Link>
                    </td>
                    <td className="pmfs-table-td">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{g.displayName}</span>
                        {g.vipStatus && (
                          <span className="p-0.5 bg-amber-100 text-amber-700 rounded" title="VIP Guest">
                            <Star className="w-3 h-3 fill-amber-500" />
                          </span>
                        )}
                        {g.blacklistedStatus && (
                          <span className="p-0.5 bg-rose-100 text-rose-700 rounded" title="Blacklisted">
                            <ShieldAlert className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="pmfs-table-td text-xs text-slate-600">
                      <div>{g.phone}</div>
                      <div className="text-slate-400">{g.email || 'No email'}</div>
                    </td>
                    <td className="pmfs-table-td text-xs text-slate-600">
                      {g.city || '—'}, {g.country}
                    </td>
                    <td className="pmfs-table-td">
                      <Badge variant={g.guestType === 'VIP' ? 'warning' : 'neutral'}>
                        {g.guestType}
                      </Badge>
                    </td>
                    <td className="pmfs-table-td font-bold text-slate-900">
                      {g._count?.reservations || 0}
                    </td>
                    <td className="pmfs-table-td text-right">
                      <Link
                        href={`/guests/${g.id}`}
                        className="inline-flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors text-xs font-semibold"
                      >
                        <Eye className="w-4 h-4" />
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Guest Profile */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Guest Profile" maxWidth="lg">
        <form onSubmit={handleCreateCheck} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Middle Name
              </label>
              <input
                type="text"
                value={form.middleName}
                onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Company / Organization
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {saving ? 'Validating...' : 'Create Guest Profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Duplicate Guest Warning */}
      <Modal isOpen={isDuplicateOpen} onClose={() => setIsDuplicateOpen(false)} title="Possible Existing Guest Profiles Found" maxWidth="md">
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Duplicate Match Warning</div>
              <p className="mt-0.5">
                The phone number or name you entered matches existing guest profile(s) in the database.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {possibleDuplicates.map((dup) => (
              <div key={dup.id} className="p-3 flex items-center justify-between text-xs bg-white hover:bg-slate-50">
                <div>
                  <div className="font-bold text-slate-900">{dup.displayName}</div>
                  <div className="text-slate-500">{dup.phone} • {dup.city || 'No city'}</div>
                </div>
                <Link
                  href={`/guests/${dup.id}`}
                  className="px-3 py-1 bg-brand-50 text-brand-700 font-bold rounded text-xs hover:bg-brand-100"
                >
                  Open Profile
                </Link>
              </div>
            ))}
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              onClick={() => setIsDuplicateOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={submitNewGuest}
              disabled={saving}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md"
            >
              Continue Creating New Profile
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
