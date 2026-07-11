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
import { createSimulatedFleet, stepSimulatedFleet } from '../utils/simulator'
import { useAuth } from '../context/AuthContext'

const APP_MODE = import.meta.env.VITE_APP_MODE || 'development'
const UPDATE_INTERVAL_MS = 100 // spec: send position every 100ms

export default function Dashboard() {
  const { user } = useAuth()
  const [view, setView] = useState('map')
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [clock, setClock] = useState(new Date())
  const [speedHistory, setSpeedHistory] = useState([])
  const [packetHistory, setPacketHistory] = useState([])
  const [simFleet, setSimFleet] = useState([])

  const accessToken = localStorage.getItem('citsx_access_token')
  const { position: geoPosition, error: geoError } = useGeolocation({ enabled: true })
  const { status: wsStatus, nearbyVehicles, events, rtt, send } = useWebSocket(accessToken)

  // "self" is this laptop's own vehicle: real GPS if available, else a gentle
  // simulated drift around a fixed point so the app is demoable indoors.
  const fallbackSelf = useRef({ latitude: 13.0827, longitude: 80.2707, heading: 90, speed: 30 })
  const self = useMemo(() => {
    const base = geoPosition || fallbackSelf.current
    return {
      vehicleId: user?.vehicle_id,
      vehicleType: user?.vehicle_type || 'Car',
      ...base,
      acceleration: 0,
      brake: false,
      timestamp: Date.now() / 1000,
    }
  }, [geoPosition, user])

  // Send position updates every 100ms over the persistent WebSocket.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!self.latitude) return
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

  // Development Mode: run a locally-simulated fleet of 20-50 vehicles so the
  // dashboard is fully demoable on one laptop without other real vehicles.
  useEffect(() => {
    if (APP_MODE !== 'development') return
    setSimFleet(createSimulatedFleet({ lat: self.latitude, lng: self.longitude }, 30))
    const interval = setInterval(() => {
      setSimFleet((f) => stepSimulatedFleet(f, UPDATE_INTERVAL_MS / 1000))
    }, UPDATE_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const effectiveNearby = APP_MODE === 'development' ? [...nearbyVehicles, ...simFleet] : nearbyVehicles

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
              Mode: <span className="text-accent-cyan font-mono">{APP_MODE}</span>
              {geoError && <span className="text-risk-warning ml-2">GPS unavailable, using simulated position</span>}
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
              {effectiveNearby.length === 0 && APP_MODE === 'production' ? (
                <div className="w-full h-full flex items-center justify-center glass-card">
                  <div className="text-center">
                    <p className="font-semibold text-slate-300">No Active Vehicles</p>
                    <p className="text-sm text-slate-500">Waiting for Vehicle Connections</p>
                  </div>
                </div>
              ) : (
                <MapView
                  self={self}
                  nearby={effectiveNearby}
                  predictions={predictions}
                  onSelectVehicle={setSelectedVehicle}
                />
              )}
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
