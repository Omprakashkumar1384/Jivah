"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/set-password", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      router.push("/dashboard/patient");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div
        className="hidden md:flex flex-col justify-between p-12 text-white"
        style={{ background: "linear-gradient(160deg, #8f1128 0%, #c81e3a 55%, #a3142f 100%)" }}
      >
        <div className="font-display text-3xl tracking-tight">Jivah</div>
        <div>
          <p className="font-display text-4xl leading-snug max-w-sm">
            Almost there.
          </p>
          <p className="mt-4 text-white/70 max-w-sm text-sm">
            Set a password so you can sign in quickly next time — no OTP needed.
          </p>
        </div>
        <svg viewBox="0 0 400 40" className="w-full max-w-sm opacity-70">
          <polyline points="0,20 60,20 80,5 100,35 120,20 400,20" fill="none" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--ink-muted)] mb-2">
            Set Password
          </p>
          <h1 className="font-display text-3xl mb-1">Create your password</h1>
          <p className="text-sm text-[var(--ink-muted)] mb-8">
            Next time, sign in with your phone number and this password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs text-[var(--ink-muted)]">New password</label>
              <input
                className="input-underline w-full"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Confirm password</label>
              <input
                className="input-underline w-full"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--red)] bg-[var(--red-tint)] px-3 py-2 rounded">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md text-white font-medium disabled:opacity-60"
              style={{ background: "var(--red)" }}
            >
              {loading ? "Saving…" : "Save Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
