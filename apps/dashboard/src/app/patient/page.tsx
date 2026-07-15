"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { apiFetch } from "@/lib/api";

interface Appointment {
  id: string;
  booking_number: string;
  status: string;
  queue_position?: number | null;
  scheduled_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting Payment",
  paid: "Paid",
  in_queue: "In Queue",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:4000";

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);

  useEffect(() => {
    apiFetch("/appointments/mine")
      .then(setAppointments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Connect to the realtime service and subscribe to each appointment's room
  useEffect(() => {
    if (appointments.length === 0) return;

    const socket: Socket = io(REALTIME_URL);

    socket.on("connect", () => {
      setLive(true);
      appointments.forEach((a) => {
        socket.emit("subscribe:appointment", a.id);
      });
    });

    socket.on("disconnect", () => setLive(false));

    socket.on("queue-update", (payload: any) => {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === payload.appointmentId
            ? { ...a, status: payload.status, queue_position: payload.queuePosition }
            : a,
        ),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [appointments.length]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-3xl" style={{ color: "var(--ink)" }}>
          Your Appointments
        </h2>
        {live && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#22c55e" }}
            />
            Live
          </span>
        )}
      </div>

      {loading && <p style={{ color: "var(--ink-muted)" }}>Loading your appointments...</p>}
      {error && (
        <p className="text-sm text-[var(--red)] bg-[var(--red-tint)] px-3 py-2 rounded inline-block">
          {error}
        </p>
      )}
      {!loading && !error && appointments.length === 0 && (
        <p style={{ color: "var(--ink-muted)" }}>
          You don&apos;t have any appointments yet.
        </p>
      )}
      {!loading && appointments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: "1.5px solid var(--line)" }}>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
                  Booking
                </th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
                  Status
                </th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
                  Queue Position
                </th>
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
                  Booked On
                </th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td className="py-3 pr-4 font-mono-data text-sm">{a.booking_number}</td>
                  <td className="py-3 pr-4">
                    <span
                      className="text-xs px-3 py-1 rounded-full border"
                      style={{ borderColor: "var(--red)", color: "var(--red)" }}
                    >
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm" style={{ color: "var(--ink-muted)" }}>
                    {a.queue_position != null ? `#${a.queue_position}` : "—"}
                  </td>
                  <td className="py-3 pr-4 text-sm" style={{ color: "var(--ink-muted)" }}>
                    {new Date(a.created_at).toLocaleDateString("en-IN", {
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
