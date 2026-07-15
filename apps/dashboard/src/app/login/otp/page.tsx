"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setToken } from "@/lib/api";

export default function OtpLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, otp }),
      });
      setToken(data.token);
      if (data.needsPasswordSetup) {
        router.push("/login/set-password");
      } else {
        router.push("/dashboard/patient");
      }
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
            New here? Let's get you set up.
          </p>
          <p className="mt-4 text-white/70 max-w-sm text-sm">
            Verify your phone number and you'll be booking appointments in under a minute.
          </p>
        </div>
        <svg viewBox="0 0 400 40" className="w-full max-w-sm opacity-70">
          <polyline points="0,20 60,20 80,5 100,35 120,20 400,20" fill="none" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--ink-muted)] mb-2">
            Patient Sign Up
          </p>
          <h1 className="font-display text-3xl mb-1">
            {step === "phone" ? "Verify your phone" : "Enter the code"}
          </h1>
          <p className="text-sm text-[var(--ink-muted)] mb-8">
            {step === "phone"
              ? "We'll send a one-time code to this number."
              : `Code sent to ${phone}.`}
          </p>

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="text-xs text-[var(--ink-muted)]">Phone number</label>
                <input
                  className="input-underline w-full"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
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
                {loading ? "Sending…" : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="text-xs text-[var(--ink-muted)]">One-time code</label>
                <input
                  className="input-underline w-full"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
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
                {loading ? "Verifying…" : "Verify"}
              </button>
            </form>
          )}

          <div className="mt-6 text-sm">
            <a href="/login" className="text-[var(--ink-muted)] hover:text-[var(--red)]">
              Already have a password? Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
