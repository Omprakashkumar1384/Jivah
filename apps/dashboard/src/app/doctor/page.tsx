"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface QueueItem {
  id: string;
  booking_number: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  patient_name: string;
  patient_phone: string;
}

const statusLabels: Record<string, string> = {
  pending_payment: "Pending Payment",
  paid: "Paid",
  in_queue: "In Queue",
  in_progress: "In Progress",
  completed: "Completed",
};

export default function DoctorQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/appointments/doctor-queue")
      .then(setQueue)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="font-display text-3xl mb-6" style={{ color: "var(--ink)" }}>
        Your Patient Queue
      </h2>

      {loading && <p style={{ color: "var(--ink-muted)" }}>Loading queue...</p>}
      {error && <p style={{ color: "var(--red)" }}>{error}</p>}

      {!loading && !error && queue.length === 0 && (
        <p style={{ color: "var(--ink-muted)" }}>
          No patients assigned to you yet.
        </p>
      )}

      {!loading && queue.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: "1.5px solid var(--line)" }}>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>Booking</th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>Patient</th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>Phone</th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>Status</th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>Booked On</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td className="py-3 pr-4 font-mono-data text-sm">{item.booking_number}</td>
                  <td className="py-3 pr-4">{item.patient_name || "Unnamed Patient"}</td>
                  <td className="py-3 pr-4 font-mono-data text-sm">{item.patient_phone}</td>
                  <td className="py-3 pr-4">
                    <span
                      className="text-xs px-2 py-1 rounded-full border"
                      style={{ color: "var(--red)", borderColor: "var(--red)", background: "var(--red-tint)" }}
                    >
                      {statusLabels[item.status] || item.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm" style={{ color: "var(--ink-muted)" }}>
                    {new Date(item.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
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
