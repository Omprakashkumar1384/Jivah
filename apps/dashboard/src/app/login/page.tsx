"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/api";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      setToken(data.token);
      const role = data.user.role;
      const routes: Record<string, string> = {
        hospital_head: "/dashboard",
        doctor: "/doctor",
        staff: "/staff-portal",
        medical_store_owner: "/store-portal",
        patient: "/patient",
      };
      router.push(routes[role] || "/dashboard/patient");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div
        className="hidden md:flex flex-col justify-between p-12 text-white"
        style={{ background: "linear-gradient(160deg, #8f1128 0%, #c81e3a 55%, #a3142f 100%)" }}
      >
        <div className="font-display text-3xl tracking-tight">Jivah</div>
        <div>
          <p className="font-display text-4xl leading-snug max-w-sm">
            One login. Every role. A hospital that runs on time.
          </p>
          <p className="mt-4 text-white/70 max-w-sm text-sm">
            Patients, doctors, staff and store owners — each with their own
            dashboard, all connected to one system of record.
          </p>
        </div>
        <svg viewBox="0 0 400 40" className="w-full max-w-sm opacity-70">
          <polyline points="0,20 60,20 80,5 100,35 120,20 400,20" fill="none" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--ink-muted)] mb-2">Sign in</p>
          <h1 className="font-display text-3xl mb-1">Welcome back</h1>
          <p className="text-sm text-[var(--ink-muted)] mb-8">
            Use your phone number or email to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Phone number or email</label>
              <input
                className="input-underline w-full"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="9876543210 or you@hospital.com"
                required
              />
            </div>
            <div>
              <label className="text-xs text-[var(--ink-muted)]">Password</label>
              <input
                className="input-underline w-full"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--red)] bg-[var(--red-tint)] px-3 py-2 rounded">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md text-white font-medium transition-colors disabled:opacity-60"
              style={{ background: "var(--red)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--red-deep)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--red)")}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 flex justify-between text-sm">
            <a href="/login/otp" className="text-[var(--ink-muted)] hover:text-[var(--red)]">
              New patient? Sign up with OTP
            </a>
            <a href="/login/forgot" className="text-[var(--ink-muted)] hover:text-[var(--red)]">
              Forgot password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
