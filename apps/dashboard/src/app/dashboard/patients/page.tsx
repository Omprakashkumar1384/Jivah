'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  gender: string | null;
  dob: string | null;
  last_visit: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/appointments/hospital-patients')
      .then(setPatients)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="font-display text-3xl mb-6" style={{ color: 'var(--ink)' }}>
        Patients
      </h2>

      {loading && <p style={{ color: 'var(--ink-muted)' }}>Loading patients...</p>}
      {error && <p style={{ color: 'var(--red)' }}>{error}</p>}

      {!loading && !error && patients.length === 0 && (
        <p style={{ color: 'var(--ink-muted)' }}>No patients yet.</p>
      )}

      {!loading && patients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--line)' }}>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>
                  Name
                </th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>
                  Phone
                </th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>
                  Gender
                </th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>
                  Last Visit
                </th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="py-3 pr-4">{p.full_name || 'Unnamed Patient'}</td>
                  <td className="py-3 pr-4 font-mono-data text-sm">{p.phone}</td>
                  <td className="py-3 pr-4" style={{ color: 'var(--ink-muted)' }}>
                    {p.gender || '—'}
                  </td>
                  <td className="py-3 pr-4 text-sm" style={{ color: 'var(--ink-muted)' }}>
                    {new Date(p.last_visit).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
