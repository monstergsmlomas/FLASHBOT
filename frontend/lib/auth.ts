import { api } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Tenant {
  id: string;
  name: string;
  businessType: string;
  modules: string[];
}

export interface AuthData {
  user: User;
  tenant: Tenant;
  accessToken: string;
}

export async function login(email: string, password: string): Promise<AuthData> {
  const { data } = await api.post('/auth/login', { email, password });
  saveAuth(data);
  return data;
}

export async function register(body: {
  businessName: string;
  businessType: string;
  name: string;
  email: string;
  password: string;
}): Promise<AuthData> {
  const { data } = await api.post('/auth/register', body);
  saveAuth(data);
  return data;
}

/** Refresca user + tenant desde el backend y actualiza localStorage */
export async function refreshAuth(): Promise<void> {
  try {
    const { data } = await api.get('/auth/me');
    const user: User = { id: data.id, name: data.name, email: data.email, role: data.role };
    const tenant: Tenant = data.tenant;
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenant', JSON.stringify(tenant));
    window.dispatchEvent(new Event('auth-updated'));
  } catch {
    // Si falla (token expirado etc.) el interceptor de axios ya redirige a /login
  }
}

function saveAuth(data: AuthData) {
  localStorage.setItem('token', data.accessToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('tenant', JSON.stringify(data.tenant));
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('tenant');
  window.location.href = '/login';
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function getStoredTenant(): Tenant | null {
  if (typeof window === 'undefined') return null;
  const t = localStorage.getItem('tenant');
  return t ? JSON.parse(t) : null;
}

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
}
