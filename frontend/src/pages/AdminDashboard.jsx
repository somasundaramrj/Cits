import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api/axios'

export default function AdminDashboard() {
  const [view, setView] = useState('admin')
  const [stats, setStats] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [s, v, u] = await Promise.all([
          api.get('/api/admin/stats'),
          api.get('/api/admin/connected-vehicles'),
          api.get('/api/admin/users'),
        ])
        if (!mounted) return
        setStats(s.data)
        setVehicles(v.data)
        setUsers(u.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load admin data')
      }
    }
    load()
    const id = setInterval(load, 3000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  return (
    <div className="h-screen w-screen flex p-2 gap-2 overflow-hidden">
      <Sidebar view={view} setView={setView} />
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
        <div className="glass-card">
          <h1 className="font-bold text-lg">Admin — System Overview</h1>
          {error && <p className="text-red-300 text-sm mt-1">{error}</p>}
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="glass-card">
                <div className="text-xs text-slate-400">{k}</div>
                <div className="text-xl font-bold font-mono">{String(v)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
          <div className="glass-card overflow-y-auto">
            <h3 className="text-sm font-semibold mb-2">Connected Vehicles ({vehicles.length})</h3>
            <table className="w-full text-xs">
              <thead className="text-slate-400 text-left">
                <tr>
                  <th className="pb-2">Vehicle ID</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Speed</th>
                  <th className="pb-2">Last Seen</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {vehicles.map((v) => (
                  <tr key={v.vehicleId} className="border-t border-white/5">
                    <td className="py-1.5">{v.vehicleId}</td>
                    <td>{v.role}</td>
                    <td>{Math.round(v.state?.speed || 0)} km/h</td>
                    <td>{new Date(v.lastSeen * 1000).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-card overflow-y-auto">
            <h3 className="text-sm font-semibold mb-2">Registered Users ({users.length})</h3>
            <table className="w-full text-xs">
              <thead className="text-slate-400 text-left">
                <tr>
                  <th className="pb-2">Vehicle ID</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {users.map((u) => (
                  <tr key={u.vehicleId} className="border-t border-white/5">
                    <td className="py-1.5">{u.vehicleId}</td>
                    <td className="font-sans">{u.fullName}</td>
                    <td>{u.vehicleType}</td>
                    <td>{u.accountStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
