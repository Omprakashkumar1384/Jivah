const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jivah_token');
}

export function setToken(token: string) {
  localStorage.setItem('jivah_token', token);
}

export function clearToken() {
  localStorage.removeItem('jivah_token');
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Something went wrong' }));
    throw new Error(error.message || 'Request failed');
  }

  return res.json();
}
