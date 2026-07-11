import { motion } from 'framer-motion'
import {
  FiTruck, FiUsers, FiAlertTriangle, FiActivity,
  FiWifi, FiClock, FiUpload, FiDownload,
} from 'react-icons/fi'

function Card({ icon, label, value, accent = 'text-accent-cyan', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card flex items-center gap-3"
    >
      <div className={`text-xl ${accent}`}>{icon}</div>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-lg font-bold font-mono">{value}</div>
      </div>
    </motion.div>
  )
}

export default function StatsCards({ stats, connectionStatus, rtt }) {
  const items = [
    { icon: <FiUsers />, label: 'Connected Vehicles', value: stats.connectedVehicles ?? 0 },
    { icon: <FiTruck />, label: 'Nearby Vehicles', value: stats.nearbyCount ?? 0 },
    { icon: <FiAlertTriangle />, label: 'Collision Alerts', value: stats.collisionAlerts ?? 0, accent: 'text-risk-collision' },
    { icon: <FiActivity />, label: 'Emergency Vehicles', value: stats.emergencyVehicles ?? 0, accent: 'text-risk-emergency' },
    { icon: <FiActivity />, label: 'Average Speed', value: `${stats.averageSpeed ?? 0} km/h` },
    { icon: <FiUpload />, label: 'Packets Sent', value: stats.packetsSent ?? 0 },
    { icon: <FiDownload />, label: 'Packets Received', value: stats.packetsReceived ?? 0 },
    { icon: <FiClock />, label: 'Round-Trip Time', value: rtt != null ? `${rtt} ms` : '—' },
    {
      icon: <FiWifi />,
      label: 'WebSocket Status',
      value: connectionStatus,
      accent: connectionStatus === 'connected' ? 'text-risk-safe' : 'text-risk-warning',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {items.map((it, i) => (
        <Card key={it.label} {...it} delay={i * 0.02} />
      ))}
    </div>
  )
}
