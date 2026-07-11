import { FiMap, FiBarChart2, FiShield, FiLogOut, FiMapPin } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

export default function Sidebar({ view, setView }) {
  const { user, logout } = useAuth()

  const items = [
    { id: 'map', label: 'Live Map', icon: <FiMap /> },
    { id: 'analytics', label: 'Analytics', icon: <FiBarChart2 /> },
  ]
  if (user?.role === 'admin') items.push({ id: 'admin', label: 'Admin', icon: <FiShield /> })

  return (
    <div className="w-16 md:w-56 h-full glass-card !rounded-r-none flex flex-col justify-between py-4 px-2 md:px-3">
      <div>
        <div className="flex items-center gap-2 px-2 mb-8">
          <FiMapPin className="text-accent-cyan" size={22} />
          <span className="hidden md:inline font-bold text-sm tracking-wide">C-ITS</span>
        </div>
        <nav className="space-y-1">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm transition ${
                view === it.id ? 'bg-accent-cyan/15 text-accent-cyan' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <span>{it.icon}</span>
              <span className="hidden md:inline">{it.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div>
        <div className="hidden md:block px-2 mb-2 text-xs text-slate-500">
          {user?.full_name}
          <div className="font-mono text-accent-cyan">{user?.vehicle_id}</div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition"
        >
          <FiLogOut />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </div>
  )
}
