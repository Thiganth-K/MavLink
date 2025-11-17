type Admin = { _id: string; username: string; role: 'admin' };

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function listAdmins(): Promise<Admin[]> {
  const res = await fetch(`${API_BASE}/api/admins`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Failed to load admins');
  return res.json();
}

export async function createAdmin(username: string, password: string): Promise<Admin> {
  const res = await fetch(`${API_BASE}/api/admins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to create admin');
  return res.json();
}

export async function updateAdmin(id: string, data: { username?: string; password?: string }): Promise<Admin> {
  const res = await fetch(`${API_BASE}/api/admins/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to update admin');
  return res.json();
}

export async function deleteAdmin(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admins/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to delete admin');
}
