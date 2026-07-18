"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { apiFetch } from "@/lib/api";

interface QueueItem {
  id: string;
  booking_number: string;
  status: string;
  queue_position?: number | null;
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

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:4000";

export default function DoctorQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);

  useEffect(() => {
    apiFetch("/appointments/doctor-queue")
      .then(setQueue)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Connect to the realtime service and subscribe to each queue item's room
  useEffect(() => {
    if (queue.length === 0) return;

    const socket: Socket = io(REALTIME_URL);

    socket.on("connect", () => {
      setLive(true);
      queue.forEach((item) => {
        socket.emit("subscribe:appointment", item.id);
      });
    });

    socket.on("disconnect", () => setLive(false));

    socket.on("queue-update", (payload: any) => {
      setQueue((prev) =>
        prev.map((item) =>
          item.id === payload.appointmentId
            ? { ...item, status: payload.status, queue_position: payload.queuePosition }
            : item,
        ),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [queue.length]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-3xl" style={{ color: "var(--ink)" }}>
          Your Patient Queue
        </h2>
        {live && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
            Live
          </span>
        )}
      </div>

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
                <th className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>Queue Position</th>
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
                    {item.queue_position != null ? `#${item.queue_position}` : "—"}
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
