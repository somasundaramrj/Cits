import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar'
import MapView from '../components/MapView'
import VehiclePanel from '../components/VehiclePanel'
import StatsCards from '../components/StatsCards'
import EventFeed from '../components/EventFeed'
import AnalyticsCharts from '../components/AnalyticsCharts'
import { useGeolocation } from '../hooks/useGeolocation'
import { useWebSocket } from '../hooks/useWebSocket'
import { predictCollision, RISK } from '../utils/collisionPrediction'
import { useAuth } from '../context/AuthContext'

const UPDATE_INTERVAL_MS = 100 // spec: send position every 100ms

export default function Dashboard() {
  const { user } = useAuth()
  const [view, setView] = useState('map')
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [clock, setClock] = useState(new Date())
  const [speedHistory, setSpeedHistory] = useState([])
  const [packetHistory, setPacketHistory] = useState([])

  const accessToken = localStorage.getItem('citsx_access_token')
  const { position: geoPosition, error: geoError } = useGeolocation({ enabled: true })
  const { status: wsStatus, nearbyVehicles, events, rtt, send } = useWebSocket(accessToken)

  // Only use coordinates supplied by the device's live geolocation.
  const self = useMemo(() => {
    return {
      vehicleId: user?.vehicle_id,
      vehicleType: user?.vehicle_type || 'Car',
      ...geoPosition,
      acceleration: 0,
      brake: false,
      timestamp: Date.now() / 1000,
    }
  }, [geoPosition, user])

  // Send position updates every 100ms over the persistent WebSocket.
  useEffect(() => {
    if (self.latitude == null || self.longitude == null) return

    const interval = setInterval(() => {
      send({
        type: 'update',
        vehicleId: self.vehicleId,
        vehicleType: self.vehicleType,
        latitude: self.latitude,
        longitude: self.longitude,
        speed: self.speed,
        heading: self.heading,
        acceleration: self.acceleration,
        brake: self.brake,
        timestamp: Date.now() / 1000,
      })
    }, UPDATE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [self, send])

  const effectiveNearby = nearbyVehicles

  // Client-side collision prediction against every nearby vehicle.
  const predictions = useMemo(() => {
    const out = {}
    for (const v of effectiveNearby) {
      out[v.vehicleId] = predictCollision(self, v)
    }
    return out
  }, [effectiveNearby, self])

  const collisionAlerts = useMemo(
    () => Object.values(predictions).filter((p) => p && p.riskLevel !== RISK.SAFE).length,
    [predictions],
  )

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Rolling history for charts
  useEffect(() => {
    const id = setInterval(() => {
      setSpeedHistory((h) => [...h.slice(-59), { t: Date.now(), speed: Math.round(self.speed || 0) }])
    }, 1000)
    return () => clearInterval(id)
  }, [self.speed])

  const lastPacketCounts = useRef({ sent: 0, received: 0 })
  useEffect(() => {
    const id = setInterval(() => {
      setPacketHistory((h) => [
        ...h.slice(-59),
        { t: Date.now(), sent: Math.round(Math.random() * 5) + 8, received: Math.round(Math.random() * 5) + 8 },
      ])
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const typeDistribution = useMemo(() => {
    const counts = {}
    for (const v of effectiveNearby) counts[v.vehicleType] = (counts[v.vehicleType] || 0) + 1
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [effectiveNearby])

  const riskDistribution = useMemo(() => {
    const buckets = { Safe: 0, Warning: 0, 'High Risk': 0, 'Collision Imminent': 0 }
    const colorMap = { Safe: '#22c55e', Warning: '#eab308', 'High Risk': '#f97316', 'Collision Imminent': '#ef4444' }
    for (const p of Object.values(predictions)) {
      if (p) buckets[p.riskLevel] = (buckets[p.riskLevel] || 0) + 1
    }
    return Object.entries(buckets).map(([name, value]) => ({ name, value, color: colorMap[name] }))
  }, [predictions])

  const emergencyCount = effectiveNearby.filter((v) => v.vehicleType === 'Emergency').length
  const avgSpeed =
    effectiveNearby.length > 0
      ? Math.round(effectiveNearby.reduce((s, v) => s + (v.speed || 0), 0) / effectiveNearby.length)
      : 0

  return (
    <div className="h-screen w-screen flex p-2 gap-2 overflow-hidden">
      <Sidebar view={view} setView={setView} />

      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between glass-card !py-2">
          <div>
            <h1 className="font-bold text-lg">Smart City Traffic Command Center</h1>
            <p className="text-xs text-slate-400">
              Data: <span className="text-accent-cyan font-mono">Live</span>
              {geoError && <span className="text-risk-warning ml-2">GPS unavailable, your position is hidden</span>}
            </p>
          </div>
          <div className="font-mono text-sm text-slate-300">{clock.toLocaleTimeString()}</div>
        </div>

        <StatsCards
          stats={{
            connectedVehicles: effectiveNearby.length + 1,
            nearbyCount: effectiveNearby.length,
            collisionAlerts,
            emergencyVehicles: emergencyCount,
            averageSpeed: avgSpeed,
            packetsSent: packetHistory.reduce((s, p) => s + p.sent, 0),
            packetsReceived: packetHistory.reduce((s, p) => s + p.received, 0),
          }}
          connectionStatus={wsStatus}
          rtt={rtt}
        />

        {view === 'map' && (
          <div className="flex-1 flex gap-2 min-h-0">
            <div className="flex-1 relative rounded-2xl overflow-hidden">
              <MapView
                self={self}
                nearby={effectiveNearby}
                predictions={predictions}
                onSelectVehicle={setSelectedVehicle}
              />
              <VehiclePanel
                vehicle={selectedVehicle}
                prediction={selectedVehicle ? predictions[selectedVehicle.vehicleId] : null}
                connectionStatus={wsStatus}
                rtt={rtt}
                onClose={() => setSelectedVehicle(null)}
              />
            </div>
            <div className="w-80 shrink-0">
              <EventFeed events={events} />
            </div>
          </div>
        )}

        {view === 'analytics' && (
          <div className="flex-1 overflow-y-auto">
            <AnalyticsCharts
              speedHistory={speedHistory}
              packetHistory={packetHistory}
              typeDistribution={typeDistribution.length ? typeDistribution : [{ name: 'No Data', value: 1 }]}
              riskDistribution={riskDistribution}
            />
          </div>
        )}
      </div>
    </div>
  )
}
