'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, clearToken } from '@/lib/api';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/patients', label: 'Patients' },
  { href: '/dashboard/staff', label: 'Staff' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
    } else {
      setChecking(false);
    }
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--ink-muted)]">
        Loading…
      </div>
    );
  }

  const pageTitle =
    navItems.find((item) => item.href === pathname)?.label || 'Overview';

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[var(--line)] flex flex-col">
        <div className="px-6 py-6 border-b border-[var(--line)]">
          <div className="font-display text-2xl">Jivah</div>
          <div className="text-xs text-[var(--ink-muted)] mt-1">Hospital Head</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2.5 rounded-md text-sm transition-colors relative"
                style={{
                  color: active ? 'var(--red)' : 'var(--ink)',
                  background: active ? 'var(--red-tint)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r"
                    style={{ background: 'var(--red)' }}
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-[var(--line)]">
          <button
            onClick={handleLogout}
            className="text-sm text-[var(--ink-muted)] hover:text-[var(--red)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-[var(--line)] px-8 py-5 flex justify-between items-center">
          <div>
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--ink-muted)]">
              Dashboard
            </p>
            <h1 className="font-display text-2xl">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs px-3 py-1 rounded-full border"
              style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
            >
              Hospital Head
            </span>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ background: 'var(--red)' }}
            >
              H
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 bg-[var(--bg-subtle)]">{children}</main>
      </div>
    </div>
  );
}
