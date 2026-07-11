import { AnimatePresence, motion } from 'framer-motion'
import {
  FiLogIn, FiLogOut, FiAlertTriangle, FiZap, FiTruck, FiClock,
} from 'react-icons/fi'

const EVENT_META = {
  VehicleConnected: { icon: <FiLogIn />, color: 'text-risk-safe', label: 'Vehicle Connected' },
  VehicleDisconnected: { icon: <FiLogOut />, color: 'text-slate-400', label: 'Vehicle Disconnected' },
  CollisionWarning: { icon: <FiAlertTriangle />, color: 'text-risk-collision', label: 'Collision Warning' },
  HardBrake: { icon: <FiAlertTriangle />, color: 'text-risk-warning', label: 'Hard Brake' },
  SuddenAcceleration: { icon: <FiZap />, color: 'text-risk-warning', label: 'Sudden Acceleration' },
  EmergencyVehicle: { icon: <FiTruck />, color: 'text-risk-emergency', label: 'Emergency Vehicle' },
  TrafficCongestion: { icon: <FiTruck />, color: 'text-risk-high', label: 'Traffic Congestion' },
  PacketDelay: { icon: <FiClock />, color: 'text-slate-400', label: 'Packet Delay' },
  HighSpeedAlert: { icon: <FiZap />, color: 'text-risk-warning', label: 'High Speed Alert' },
  VehicleEnteredRadius: { icon: <FiLogIn />, color: 'text-accent-cyan', label: 'Vehicle Entered Radius' },
  VehicleLeftRadius: { icon: <FiLogOut />, color: 'text-slate-500', label: 'Vehicle Left Radius' },
}

export default function EventFeed({ events }) {
  return (
    <div className="glass-card h-full flex flex-col">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Live Event Feed</h3>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        <AnimatePresence initial={false}>
          {events.length === 0 && (
            <p className="text-xs text-slate-500 mt-4 text-center">Waiting for events…</p>
          )}
          {events.map((ev) => {
            const meta = EVENT_META[ev.type] || { icon: <FiClock />, color: 'text-slate-400', label: ev.type }
            return (
              <motion.div
                key={ev._id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-xs bg-white/5 rounded-lg px-2.5 py-1.5"
              >
                <span className={meta.color}>{meta.icon}</span>
                <span className="flex-1 truncate">
                  <span className="font-semibold">{meta.label}</span>
                  {ev.vehicleId && <span className="text-slate-400 font-mono"> · {ev.vehicleId}</span>}
                </span>
                <span className="text-slate-500 font-mono">
                  {new Date((ev.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString()}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
