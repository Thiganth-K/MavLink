import { useState } from 'react'
import { login } from '../services/api'

export default function LoginPage() {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<string | null>(null)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setMessage(null)
		setLoading(true)
		try {
			const res = await login(username, password)
			localStorage.setItem('token', res.token)
			setMessage(`Welcome, ${res.user.username}!`)
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Login failed'
			setMessage(msg)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
			<div className="w-full max-w-sm bg-white shadow rounded p-6">
				<h1 className="text-2xl font-semibold mb-4">Sign in</h1>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm mb-1" htmlFor="username">Username</label>
						<input
							id="username"
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
							placeholder="Enter username"
							autoComplete="username"
						/>
					</div>
					<div>
						<label className="block text-sm mb-1" htmlFor="password">Password</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
							placeholder="Enter password"
							autoComplete="current-password"
						/>
					</div>
					<button
						type="submit"
						disabled={loading}
						className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700 disabled:opacity-60"
					>
						{loading ? 'Signing in...' : 'Sign in'}
					</button>
				</form>
				{message && (
					<p className="mt-4 text-sm text-center text-gray-700">{message}</p>
				)}
			</div>
		</div>
	)
}

