'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  KeyRound,
  Edit,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // Add User Form State
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    roleId: '',
    newPassword: '',
  });

  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const url = `/api/users?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setRoles(data.roles || []);
        if (data.roles?.length > 0 && !addForm.roleId) {
          setAddForm((prev) => ({ ...prev, roleId: data.roles[0].id }));
        }
      } else {
        showToast('Failed to fetch user directory', 'error');
      }
    } catch (e) {
      showToast('Network error fetching users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create staff member', 'error');
        setSaving(false);
        return;
      }

      showToast(`Staff member "${addForm.fullName}" created successfully!`, 'success');
      setIsAddOpen(false);
      setAddForm({ fullName: '', email: '', phone: '', password: '', roleId: roles[0]?.id || '' });
      fetchUsers();
    } catch (err) {
      showToast('Error creating user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast(`User status updated to ${newStatus}`, 'success');
        fetchUsers();
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (e) {
      showToast('Network error updating user status', 'error');
    }
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    const currentRoleId = user.userRoles?.[0]?.roleId || roles[0]?.id || '';
    setEditForm({
      fullName: user.fullName,
      phone: user.phone || '',
      roleId: currentRoleId,
      newPassword: '',
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        showToast(`User "${selectedUser.fullName}" updated successfully!`, 'success');
        setIsEditOpen(false);
        fetchUsers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update user', 'error');
      }
    } catch (e) {
      showToast('Error updating user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (user: any) => {
    setUserToDelete(user);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Staff member "${userToDelete.fullName}" deleted successfully!`, 'success');
        setIsDeleteOpen(false);
        setUserToDelete(null);
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to delete staff member', 'error');
      }
    } catch (e) {
      showToast('Network error deleting staff member', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-red-500" />
            Users & Staff Directory
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage staff accounts, assign operational roles, and enforce security access controls
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all hover:scale-105"
        >
          <UserPlus className="w-4 h-4" />
          Add New Staff Member
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="pmfs-card p-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Staff Only</option>
            <option value="INACTIVE">Inactive Staff Only</option>
          </select>

          <button
            onClick={fetchUsers}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="pmfs-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pmfs-table-th">Staff Member</th>
                <th className="pmfs-table-th">Role</th>
                <th className="pmfs-table-th">Assigned Property</th>
                <th className="pmfs-table-th">Status</th>
                <th className="pmfs-table-th">Last Login</th>
                <th className="pmfs-table-th">Created</th>
                <th className="pmfs-table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    Loading staff directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-slate-500">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleName = u.userRoles?.[0]?.role?.name || 'No Role';
                  const propName = u.userRoles?.[0]?.property?.name || 'Primary Hotel';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="pmfs-table-td">
                        {(() => {
                          const isAyan = u.email === 'ayan@indiralodge' || u.email === 'ayan@indiralodge.com' || u.fullName?.toLowerCase().includes('ayan');
                          return (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-brand-200 bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center shadow-xs">
                                {isAyan ? (
                                  <img src="/avatars/ayan.png" alt={u.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  u.fullName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{u.fullName}</div>
                                <div className="text-xs text-slate-500">{u.email}</div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="pmfs-table-td">
                        <span className="font-medium text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                          {roleName}
                        </span>
                      </td>
                      <td className="pmfs-table-td">{propName}</td>
                      <td className="pmfs-table-td">
                        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'error'}>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="pmfs-table-td text-xs text-slate-500">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="pmfs-table-td text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="pmfs-table-td text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Edit user details or reset password"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-md transition-colors ${
                              u.status === 'ACTIVE'
                                ? 'hover:bg-rose-50 text-rose-600'
                                : 'hover:bg-emerald-50 text-emerald-600'
                            }`}
                            title={u.status === 'ACTIVE' ? 'Deactivate staff account' : 'Activate staff account'}
                          >
                            {u.status === 'ACTIVE' ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openDeleteModal(u)}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete staff account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Staff Member */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Staff Member" maxWidth="lg">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={addForm.fullName}
              onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="ramesh@hotel.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned System Role *
              </label>
              <select
                required
                value={addForm.roleId}
                onChange={(e) => setAddForm({ ...addForm, roleId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Temporary Password *
              </label>
              <input
                type="password"
                required
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                placeholder="Min 8 characters"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              {saving ? 'Creating User...' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Staff Member / Reset Password */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Staff Member: ${selectedUser?.fullName}`} maxWidth="lg">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Role
              </label>
              <select
                value={editForm.roleId}
                onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <KeyRound className="w-4 h-4 text-brand-600" />
              <span>Reset Password (Optional)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Leave blank if you do not wish to reset this user's password.
            </p>
            <input
              type="password"
              value={editForm.newPassword}
              onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
              placeholder="Enter new password (min 8 chars)"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Save User Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirm Delete Staff Member */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => !deleting && setIsDeleteOpen(false)}
        title="Delete Staff Account"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">This action cannot be undone.</p>
              <p className="text-rose-700">
                Are you sure you want to permanently delete staff member{' '}
                <span className="font-extrabold underline">{userToDelete?.fullName}</span> ({userToDelete?.email})? All active sessions and assigned permissions will be revoked immediately.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50 inline-flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirm Delete
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
