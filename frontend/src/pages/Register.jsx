import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiMapPin, FiCheckCircle } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const VEHICLE_TYPES = ['Car', 'Bike', 'Truck', 'Bus', 'Emergency']

const initial = {
  full_name: '',
  email: '',
  phone_number: '',
  date_of_birth: '',
  vehicle_registration_number: '',
  vehicle_type: 'Car',
  vehicle_brand: '',
  vehicle_model: '',
  vehicle_color: '',
  manufacturing_year: new Date().getFullYear(),
  driving_license_number: '',
  license_expiry_date: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  password: '',
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const payload = { ...form, manufacturing_year: Number(form.manufacturing_year) }
      const result = await register(payload)
      setDone(result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card w-full max-w-md text-center">
          <FiCheckCircle className="mx-auto text-risk-safe mb-3" size={40} />
          <h2 className="text-xl font-bold mb-1">Vehicle Registered</h2>
          <p className="text-slate-400 text-sm mb-4">
            Your assigned Vehicle ID is{' '}
            <span className="font-mono text-accent-cyan">{done.vehicle_id}</span>
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan text-base-950 font-semibold hover:opacity-90 transition"
          >
            Continue to Sign In
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card w-full max-w-2xl"
      >
        <div className="flex items-center gap-2 mb-1">
          <FiMapPin className="text-accent-cyan" size={22} />
          <span className="font-mono text-xs tracking-widest text-slate-400">C-ITS COMMAND CENTER</span>
        </div>
        <h1 className="text-2xl font-bold mb-6">Vehicle & Driver Registration</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <Section title="Personal Details">
            <Row>
              <Input label="Full Name" value={form.full_name} onChange={(v) => set('full_name', v)} required />
              <Input label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} required />
            </Row>
            <Row>
              <Input label="Phone Number" value={form.phone_number} onChange={(v) => set('phone_number', v)} required />
              <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={(v) => set('date_of_birth', v)} required />
            </Row>
          </Section>

          <Section title="Vehicle Details">
            <Row>
              <Input label="Registration Number" value={form.vehicle_registration_number}
                onChange={(v) => set('vehicle_registration_number', v)} required />
              <Select label="Vehicle Type" value={form.vehicle_type} onChange={(v) => set('vehicle_type', v)} options={VEHICLE_TYPES} />
            </Row>
            <Row>
              <Input label="Brand" value={form.vehicle_brand} onChange={(v) => set('vehicle_brand', v)} required />
              <Input label="Model" value={form.vehicle_model} onChange={(v) => set('vehicle_model', v)} required />
            </Row>
            <Row>
              <Input label="Color" value={form.vehicle_color} onChange={(v) => set('vehicle_color', v)} required />
              <Input label="Manufacturing Year" type="number" value={form.manufacturing_year}
                onChange={(v) => set('manufacturing_year', v)} required />
            </Row>
          </Section>

          <Section title="Driver Details">
            <Row>
              <Input label="License Number" value={form.driving_license_number}
                onChange={(v) => set('driving_license_number', v)} required />
              <Input label="License Expiry Date" type="date" value={form.license_expiry_date}
                onChange={(v) => set('license_expiry_date', v)} required />
            </Row>
          </Section>

          <Section title="Emergency Contact">
            <Row>
              <Input label="Contact Name" value={form.emergency_contact_name}
                onChange={(v) => set('emergency_contact_name', v)} required />
              <Input label="Contact Number" value={form.emergency_contact_number}
                onChange={(v) => set('emergency_contact_number', v)} required />
            </Row>
          </Section>

          <Section title="Account Security">
            <Input label="Password (min 8 characters)" type="password" value={form.password}
              onChange={(v) => set('password', v)} required />
          </Section>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan text-base-950 font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? 'Registering…' : 'Register Vehicle'}
          </button>
        </form>

        <p className="text-sm text-slate-400 mt-6 text-center">
          Already registered?{' '}
          <Link to="/login" className="text-accent-cyan hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-widest text-accent-cyan/80 mb-2 uppercase">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Row({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
}

function Input({ label, type = 'text', value, onChange, required }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400 mb-1 block">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent-cyan/60 transition"
      />
    </label>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400 mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent-cyan/60 transition"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-base-900">
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
