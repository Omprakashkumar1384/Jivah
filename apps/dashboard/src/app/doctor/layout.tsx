"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearToken } from "@/lib/api";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
    } else {
      setChecking(false);
    }
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--ink-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)]">
      <header className="bg-white border-b border-[var(--line)] px-8 py-5 flex justify-between items-center">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-[var(--ink-muted)]">Jivah</p>
          <h1 className="font-display text-2xl">Doctor Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs px-3 py-1 rounded-full border"
            style={{ borderColor: "var(--red)", color: "var(--red)" }}
          >
            Doctor
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-[var(--ink-muted)] hover:text-[var(--red)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="p-8">{children}</main>
    </div>
  );
}
