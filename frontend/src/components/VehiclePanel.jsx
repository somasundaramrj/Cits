import { motion, AnimatePresence } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import { riskColor } from '../utils/collisionPrediction'

export default function VehiclePanel({ vehicle, prediction, connectionStatus, rtt, onClose }) {
  return (
    <AnimatePresence>
      {vehicle && (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          className="glass-card w-80 absolute top-4 right-4 z-10"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-xs text-slate-400">Vehicle</div>
              <div className="font-mono text-lg font-bold">{vehicle.vehicleId}</div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <FiX />
            </button>
          </div>

          <Row label="Type" value={vehicle.vehicleType} />
          <Row label="Latitude" value={vehicle.latitude?.toFixed(5)} />
          <Row label="Longitude" value={vehicle.longitude?.toFixed(5)} />
          <Row label="Speed" value={`${Math.round(vehicle.speed || 0)} km/h`} />
          <Row label="Heading" value={`${Math.round(vehicle.heading || 0)}°`} />
          <Row label="Acceleration" value={(vehicle.acceleration || 0).toFixed(2)} />
          <Row label="Brake" value={vehicle.brake ? 'Engaged' : 'Released'} />
          <Row label="Timestamp" value={new Date((vehicle.timestamp || 0) * 1000).toLocaleTimeString()} />
          <Row label="Distance" value={vehicle.distanceMeters != null ? `${vehicle.distanceMeters} m` : '—'} />
          <Row label="Connection" value={connectionStatus} />
          <Row label="Packet RTT" value={rtt != null ? `${rtt} ms` : '—'} />

          {prediction && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-xs text-slate-400 mb-1">Collision Prediction</div>
              <Row
                label="Risk Level"
                value={prediction.riskLevel}
                valueStyle={{ color: riskColor(prediction.riskLevel) }}
              />
              <Row label="Collision Probability" value={`${Math.round(prediction.collisionProbability * 100)}%`} />
              <Row
                label="Time To Collision"
                value={prediction.timeToCollisionSeconds != null ? `${prediction.timeToCollisionSeconds}s` : '—'}
              />
              <Row label="Closest Approach" value={`${prediction.closestApproach.distanceMeters} m @ +${prediction.closestApproach.atSeconds}s`} />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Row({ label, value, valueStyle }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono font-medium" style={valueStyle}>{value}</span>
    </div>
  )
}
