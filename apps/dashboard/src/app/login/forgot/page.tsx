"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setToken } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

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
      setOtpVerified(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/set-password", {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });
      router.push("/login");
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
            Forgot your password?
          </p>
          <p className="mt-4 text-white/70 max-w-sm text-sm">
            Happens to everyone. Verify your phone and set a new one.
          </p>
        </div>
        <svg viewBox="0 0 400 40" className="w-full max-w-sm opacity-70">
          <polyline points="0,20 60,20 80,5 100,35 120,20 400,20" fill="none" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--ink-muted)] mb-2">
            Reset Password
          </p>

          {!otpVerified && step === "phone" && (
            <>
              <h1 className="font-display text-3xl mb-1">Verify your phone</h1>
              <p className="text-sm text-[var(--ink-muted)] mb-8">
                Enter the phone number registered with your account.
              </p>
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div>
                  <label className="text-xs text-[var(--ink-muted)]">Registered phone number</label>
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
            </>
          )}

          {!otpVerified && step === "otp" && (
            <>
              <h1 className="font-display text-3xl mb-1">Enter the code</h1>
              <p className="text-sm text-[var(--ink-muted)] mb-8">Code sent to {phone}.</p>
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
            </>
          )}

          {otpVerified && (
            <>
              <h1 className="font-display text-3xl mb-1">Set a new password</h1>
              <p className="text-sm text-[var(--ink-muted)] mb-8">
                Choose a new password for your account.
              </p>
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="text-xs text-[var(--ink-muted)]">New password</label>
                  <input
                    className="input-underline w-full"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
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
                  {loading ? "Saving…" : "Reset Password"}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-sm">
            <a href="/login" className="text-[var(--ink-muted)] hover:text-[var(--red)]">
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
