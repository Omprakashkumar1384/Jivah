'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getToken } from '@/lib/api';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  doctor: 'Doctor',
  staff: 'Staff',
  medical_store_owner: 'Store Owner',
};

// JWT ke beech wale hisse ko decode karke payload (hospital_id waghera) nikalta hai.
// Koi extra library nahi chahiye — JWT ka format hamesha header.payload.signature hota hai.
function getHospitalIdFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.hospital_id || null;
  } catch {
    return null;
  }
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Staff form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('doctor');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  // Assign Task form state
  const [taskForStaff, setTaskForStaff] = useState<StaffMember | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [taskSuccess, setTaskSuccess] = useState('');

  function loadStaff() {
    setLoading(true);
    apiFetch('/users/staff')
      .then(setStaff)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setTempPassword('');
    setSubmitting(true);

    const hospital_id = getHospitalIdFromToken();
    if (!hospital_id) {
      setFormError('Could not determine your hospital. Please sign in again.');
      setSubmitting(false);
      return;
    }

    try {
      const data = await apiFetch('/auth/create-staff', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          role,
          hospital_id,
        }),
      });
      setTempPassword(data.temporaryPassword);
      setFullName('');
      setEmail('');
      setPhone('');
      setRole('doctor');
      loadStaff();
    } catch (err: any) {
      setFormError(err.message || 'Could not create staff account');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskForStaff) return;
    setTaskError('');
    setTaskSuccess('');
    setTaskSubmitting(true);

    try {
      await apiFetch('/staff/tasks/assign', {
        method: 'POST',
        body: JSON.stringify({
          assigned_to: taskForStaff.id,
          title: taskTitle,
          description: taskDescription || undefined,
        }),
      });
      setTaskSuccess(`Task assigned to ${taskForStaff.full_name || 'staff member'}.`);
      setTaskTitle('');
      setTaskDescription('');
      setTimeout(() => {
        setTaskForStaff(null);
        setTaskSuccess('');
      }, 1200);
    } catch (err: any) {
      setTaskError(err.message || 'Could not assign task');
    } finally {
      setTaskSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl" style={{ color: 'var(--ink)' }}>
          Staff
        </h2>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setTempPassword('');
            setFormError('');
          }}
          className="px-4 py-2 rounded-md text-white text-sm font-medium transition-colors"
          style={{ background: 'var(--red)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--red-deep)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--red)')}
        >
          {showAddForm ? 'Cancel' : '+ Add Staff'}
        </button>
      </div>

      {showAddForm && (
        <div
          className="mb-8 p-6 rounded-lg bg-white"
          style={{ border: '1px solid var(--line)' }}
        >
          <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Full name</label>
              <input
                className="input-underline w-full"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Role</label>
              <select
                className="input-underline w-full"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="doctor">Doctor</option>
                <option value="staff">Staff</option>
                <option value="medical_store_owner">Store Owner</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Email</label>
              <input
                className="input-underline w-full"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Phone</label>
              <input
                className="input-underline w-full"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                required
              />
            </div>

            {formError && (
              <p className="md:col-span-2 text-sm text-[var(--red)] bg-[var(--red-tint)] px-3 py-2 rounded">
                {formError}
              </p>
            )}

            {tempPassword && (
              <p className="md:col-span-2 text-sm px-3 py-2 rounded" style={{ background: 'var(--red-tint)', color: 'var(--ink)' }}>
                Account created. Temporary password (copy and share with them now — it won&apos;t be shown again):{' '}
                <strong className="font-mono-data">{tempPassword}</strong>
              </p>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-md text-white text-sm font-medium transition-colors disabled:opacity-60"
                style={{ background: 'var(--red)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--red-deep)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--red)')}
              >
                {submitting ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <p style={{ color: 'var(--ink-muted)' }}>Loading staff...</p>}
      {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
      {!loading && !error && staff.length === 0 && (
        <p style={{ color: 'var(--ink-muted)' }}>No staff members yet.</p>
      )}

      {!loading && staff.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--line)' }}>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>Name</th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>Role</th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>Email</th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>Phone</th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>Status</th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: 'var(--ink-muted)' }}></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="py-3 pr-4">{s.full_name || '—'}</td>
                  <td className="py-3 pr-4">
                    <span
                      className="text-xs px-3 py-1 rounded-full border"
                      style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
                    >
                      {ROLE_LABELS[s.role] || s.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono-data text-sm">{s.email}</td>
                  <td className="py-3 pr-4 font-mono-data text-sm">{s.phone}</td>
                  <td className="py-3 pr-4 text-sm" style={{ color: s.is_active ? 'var(--ink-muted)' : 'var(--red)' }}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </td>
                  <td className="py-3 pr-4">
                    {s.role !== 'medical_store_owner' && (
                      <button
                        onClick={() => {
                          setTaskForStaff(s);
                          setTaskError('');
                          setTaskSuccess('');
                        }}
                        className="text-sm hover:underline"
                        style={{ color: 'var(--red)' }}
                      >
                        Assign Task
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {taskForStaff && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setTaskForStaff(null)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl mb-1">Assign a task</h3>
            <p className="text-sm text-[var(--ink-muted)] mb-4">
              To {taskForStaff.full_name || 'this staff member'}
            </p>
            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="text-xs text-[var(--ink-muted)]">Title</label>
                <input
                  className="input-underline w-full"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-[var(--ink-muted)]">Description (optional)</label>
                <textarea
                  className="input-underline w-full"
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </div>
              {taskError && (
                <p className="text-sm text-[var(--red)] bg-[var(--red-tint)] px-3 py-2 rounded">{taskError}</p>
              )}
              {taskSuccess && (
                <p className="text-sm px-3 py-2 rounded" style={{ background: 'var(--red-tint)', color: 'var(--ink)' }}>
                  {taskSuccess}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="flex-1 py-2.5 rounded-md text-white text-sm font-medium disabled:opacity-60"
                  style={{ background: 'var(--red)' }}
                >
                  {taskSubmitting ? 'Assigning…' : 'Assign'}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskForStaff(null)}
                  className="flex-1 py-2.5 rounded-md text-sm"
                  style={{ border: '1px solid var(--line)', color: 'var(--ink-muted)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
