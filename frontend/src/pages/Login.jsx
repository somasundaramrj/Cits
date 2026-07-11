import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiMapPin, FiLock, FiMail } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card w-full max-w-md"
      >
        <div className="flex items-center gap-2 mb-1">
          <FiMapPin className="text-accent-cyan" size={22} />
          <span className="font-mono text-xs tracking-widest text-slate-400">C-ITS COMMAND CENTER</span>
        </div>
        <h1 className="text-2xl font-bold mb-6">Vehicle Sign-In</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <Field icon={<FiMail />} type="email" placeholder="Email" value={form.email}
            onChange={(v) => setForm({ ...form, email: v })} required />
          <Field icon={<FiLock />} type="password" placeholder="Password" value={form.password}
            onChange={(v) => setForm({ ...form, password: v })} required />

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan text-base-950 font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-sm text-slate-400 mt-6 text-center">
          New vehicle?{' '}
          <Link to="/register" className="text-accent-cyan hover:underline">
            Register here
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

function Field({ icon, type, placeholder, value, onChange, required }) {
  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-accent-cyan/60 transition">
      <span className="text-slate-500">{icon}</span>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none w-full text-sm placeholder:text-slate-500"
      />
    </div>
  )
}
