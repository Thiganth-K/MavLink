import { useEffect, useState } from 'react'
import { createAdmin, deleteAdmin, listAdmins, updateAdmin } from '../services/adminApi'
import { useNavigate } from 'react-router-dom'

export default function SuperAdminPage() {
  const navigate = useNavigate()
  const [admins, setAdmins] = useState<Array<{ _id: string; username: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    refresh()
  }, [])

  async function refresh() {
    try {
      setLoading(true)
      const data = await listAdmins()
      setAdmins(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admins')
    } finally {
      setLoading(false)
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createAdmin(username, password)
      setUsername('')
      setPassword('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add admin')
    }
  }

  async function onRename(id: string) {
    const newName = prompt('New username?')
    if (!newName) return
    try {
      await updateAdmin(id, { username: newName })
      await refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  async function onChangePassword(id: string) {
    const pwd = prompt('New password?')
    if (!pwd) return
    try {
      await updateAdmin(id, { password: pwd })
      await refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete admin?')) return
    try {
      await deleteAdmin(id)
      await refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Super Admin</h1>
          <button onClick={logout} className="text-sm text-red-600">Logout</button>
        </div>

        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
          <input
            type="text"
            placeholder="Username"
            className="border rounded px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="bg-blue-600 text-white rounded px-4 py-2">Add Admin</button>
        </form>

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <table className="w-full text-left border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Username</th>
                <th className="p-2 border w-64">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a._id}>
                  <td className="p-2 border">{a.username}</td>
                  <td className="p-2 border space-x-2">
                    <button className="text-blue-600" onClick={() => onRename(a._id)}>Rename</button>
                    <button className="text-amber-600" onClick={() => onChangePassword(a._id)}>Change Password</button>
                    <button className="text-red-600" onClick={() => onDelete(a._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
