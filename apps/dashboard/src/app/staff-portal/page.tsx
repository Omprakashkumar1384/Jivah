'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type AttendanceRow = { id: string; check_in: string | null; check_out: string | null; date: string };
type LeaveRow = { id: string; start_date: string; end_date: string; reason: string; approved: boolean };
type TaskRow = { id: string; title: string; description: string | null; status: string; created_at: string };
type TestBookingRow = {
  id: string; status: string; test_name: string; price: string | null;
  patient_name: string; patient_phone: string; created_at: string;
};
type EmergencyRow = {
  id: string; status: string; pickup_latitude: number; pickup_longitude: number;
  patient_name: string; patient_phone: string; created_at: string;
};

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="text-xs px-2 py-1 rounded-full" style={{ color, background: 'var(--bg-subtle)' }}>
      {children}
    </span>
  );
}

export default function StaffPortalPage() {
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [testBookings, setTestBookings] = useState<TestBookingRow[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', reason: '' });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [att, lv, tk, tb, eq] = await Promise.all([
        apiFetch('/staff/attendance'),
        apiFetch('/staff/leaves'),
        apiFetch('/staff/tasks'),
        apiFetch('/staff/test-bookings'),
        apiFetch('/staff/emergency-queue'),
      ]);
      setAttendance(att);
      setLeaves(lv);
      setTasks(tk);
      setTestBookings(tb);
      setEmergencies(eq);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayRow = attendance.find((a) => a.date === today);

  async function handleCheckIn() {
    setBusy(true);
    try { await apiFetch('/staff/attendance/check-in', { method: 'POST' }); await load(); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }
  async function handleCheckOut() {
    setBusy(true);
    try { await apiFetch('/staff/attendance/check-out', { method: 'POST' }); await load(); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }
  async function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await apiFetch('/staff/leaves', { method: 'POST', body: JSON.stringify(leaveForm) });
      setLeaveForm({ start_date: '', end_date: '', reason: '' });
      setShowLeaveForm(false);
      await load();
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }
  async function handleTaskStatus(id: string, status: string) {
    setBusy(true);
    try { await apiFetch(`/staff/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load(); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }
  async function handleTestStatus(id: string, status: string) {
    setBusy(true);
    try { await apiFetch(`/staff/test-bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load(); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }
  async function handleEmergencyStatus(id: string, status: string) {
    setBusy(true);
    try { await apiFetch(`/staff/emergency-queue/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load(); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }

  if (loading) return <p className="text-[var(--ink-muted)]">Loading…</p>;

  return (
    <div className="space-y-10">
      {error && <p className="text-sm text-[var(--red)] bg-[var(--red-tint)] px-3 py-2 rounded">{error}</p>}

      {/* My Tasks */}
      <section>
        <h2 className="font-display text-xl mb-4">My Tasks</h2>
        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg border border-[var(--line)] p-8 text-center">
            <p className="text-[var(--ink-muted)]">No tasks assigned yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[var(--line)] divide-y divide-[var(--line)]">
            {tasks.map((t) => (
              <div key={t.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{t.title}</p>
                  {t.description && <p className="text-sm text-[var(--ink-muted)]">{t.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={t.status === 'done' ? '#1f7a54' : '#c88a1e'}>{t.status}</Badge>
                  {t.status !== 'done' && (
                    <button
                      onClick={() => handleTaskStatus(t.id, 'done')}
                      disabled={busy}
                      className="text-xs text-[var(--red)] hover:underline disabled:opacity-50"
                    >
                      Mark done
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Test bookings */}
      <section>
        <h2 className="font-display text-xl mb-4">Lab Test Bookings</h2>
        {testBookings.length === 0 ? (
          <div className="bg-white rounded-lg border border-[var(--line)] p-8 text-center">
            <p className="text-[var(--ink-muted)]">No test bookings right now.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[var(--line)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[var(--ink-muted)]">
                  <th className="px-6 py-3 font-normal">Patient</th>
                  <th className="px-6 py-3 font-normal">Test</th>
                  <th className="px-6 py-3 font-normal">Status</th>
                  <th className="px-6 py-3 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {testBookings.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-6 py-3">{b.patient_name}<br /><span className="text-xs text-[var(--ink-muted)] font-mono-data">{b.patient_phone}</span></td>
                    <td className="px-6 py-3">{b.test_name}</td>
                    <td className="px-6 py-3"><Badge color={b.status === 'completed' ? '#1f7a54' : '#c88a1e'}>{b.status}</Badge></td>
                    <td className="px-6 py-3 text-right">
                      {b.status !== 'completed' && (
                        <button onClick={() => handleTestStatus(b.id, 'completed')} disabled={busy} className="text-xs text-[var(--red)] hover:underline disabled:opacity-50">
                          Mark completed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Emergency queue */}
      <section>
        <h2 className="font-display text-xl mb-4">Emergency Queue</h2>
        {emergencies.length === 0 ? (
          <div className="bg-white rounded-lg border border-[var(--line)] p-8 text-center">
            <p className="text-[var(--ink-muted)]">No emergency requests assigned to you.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[var(--line)] divide-y divide-[var(--line)]">
            {emergencies.map((e) => (
              <div key={e.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{e.patient_name}</p>
                  <p className="text-xs text-[var(--ink-muted)] font-mono-data">{e.patient_phone}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={e.status === 'completed' ? '#1f7a54' : '#c81e3a'}>{e.status}</Badge>
                  {e.status !== 'completed' && (
                    <button onClick={() => handleEmergencyStatus(e.id, 'completed')} disabled={busy} className="text-xs text-[var(--red)] hover:underline disabled:opacity-50">
                      Mark completed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Attendance */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-xl">Attendance</h2>
          {!todayRow ? (
            <button onClick={handleCheckIn} disabled={busy} className="text-sm px-4 py-2 rounded-md text-white disabled:opacity-60" style={{ background: 'var(--red)' }}>Check In</button>
          ) : !todayRow.check_out ? (
            <button onClick={handleCheckOut} disabled={busy} className="text-sm px-4 py-2 rounded-md text-white disabled:opacity-60" style={{ background: 'var(--red-deep)' }}>Check Out</button>
          ) : (
            <span className="text-xs text-[var(--ink-muted)]">Today's attendance complete</span>
          )}
        </div>
        {attendance.length === 0 ? (
          <div className="bg-white rounded-lg border border-[var(--line)] p-8 text-center">
            <p className="text-[var(--ink-muted)]">No attendance records yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[var(--line)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[var(--ink-muted)]">
                  <th className="px-6 py-3 font-normal">Date</th>
                  <th className="px-6 py-3 font-normal">Check In</th>
                  <th className="px-6 py-3 font-normal">Check Out</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-6 py-3">{row.date}</td>
                    <td className="px-6 py-3 font-mono-data">{row.check_in ? new Date(row.check_in).toLocaleTimeString() : '—'}</td>
                    <td className="px-6 py-3 font-mono-data">{row.check_out ? new Date(row.check_out).toLocaleTimeString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Leaves */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-xl">Leave Requests</h2>
          <button onClick={() => setShowLeaveForm((s) => !s)} className="text-sm px-4 py-2 rounded-md text-white" style={{ background: 'var(--red)' }}>
            {showLeaveForm ? 'Cancel' : '+ Request Leave'}
          </button>
        </div>
        {showLeaveForm && (
          <form onSubmit={handleLeaveSubmit} className="bg-white rounded-lg border border-[var(--line)] p-6 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Start date</label>
              <input className="input-underline w-full" type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs text-[var(--ink-muted)]">End date</label>
              <input className="input-underline w-full" type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Reason</label>
              <input className="input-underline w-full" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} required />
            </div>
            <button type="submit" disabled={busy} className="py-2.5 rounded-md text-white text-sm disabled:opacity-60" style={{ background: 'var(--red-deep)' }}>Submit</button>
          </form>
        )}
        {leaves.length === 0 ? (
          <div className="bg-white rounded-lg border border-[var(--line)] p-8 text-center">
            <p className="text-[var(--ink-muted)]">No leave requests yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[var(--line)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[var(--ink-muted)]">
                  <th className="px-6 py-3 font-normal">Dates</th>
                  <th className="px-6 py-3 font-normal">Reason</th>
                  <th className="px-6 py-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((lv) => (
                  <tr key={lv.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-6 py-3">{lv.start_date} → {lv.end_date}</td>
                    <td className="px-6 py-3">{lv.reason}</td>
                    <td className="px-6 py-3"><Badge color={lv.approved ? '#1f7a54' : '#c88a1e'}>{lv.approved ? 'Approved' : 'Pending'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
