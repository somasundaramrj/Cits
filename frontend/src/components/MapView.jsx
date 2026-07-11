import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { riskColor } from '../utils/collisionPrediction'

// Free dark tile layer from CARTO - no API key or billing account needed,
// just the attribution shown below (required by their free tier / OSM's
// license). Swap TILE_URL for the plain OSM layer if you prefer:
// "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

export default function MapView({ self, nearby, predictions, onSelectVehicle, radiusMeters = 500 }) {
  const center = useMemo(() => {
    if (self?.latitude) return [self.latitude, self.longitude]
    return [13.0827, 80.2707] // fallback: Chennai
  }, [self])

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ width: '100%', height: '100%', background: '#0a0e18' }}
      zoomControl={true}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

      {self?.latitude && (
        <>
          <CircleMarker
            center={[self.latitude, self.longitude]}
            radius={9}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#3b82f6', fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -8]}>You: {self.vehicleId}</Tooltip>
          </CircleMarker>
          <Circle
            center={[self.latitude, self.longitude]}
            radius={radiusMeters}
            pathOptions={{ color: '#22d3ee', weight: 1, opacity: 0.4, fillColor: '#22d3ee', fillOpacity: 0.04 }}
          />
        </>
      )}

      {nearby.map((v) => {
        const pred = predictions?.[v.vehicleId]
        const color = v.vehicleType === 'Emergency' ? '#3b82f6' : pred ? riskColor(pred.riskLevel) : '#22c55e'
        const ghost = pred?.projections?.[pred.projections.length - 1]?.otherFuture

        return (
          <div key={v.vehicleId}>
            <CircleMarker
              center={[v.latitude, v.longitude]}
              radius={7}
              pathOptions={{ color: '#ffffff', weight: 1, fillColor: color, fillOpacity: 1 }}
              eventHandlers={{ click: () => onSelectVehicle?.(v) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {v.vehicleId} · {v.vehicleType}
                {pred ? ` · ${pred.riskLevel}` : ''}
              </Tooltip>
            </CircleMarker>

            {ghost && (
              <CircleMarker
                center={[ghost.latitude, ghost.longitude]}
                radius={4}
                pathOptions={{ color, weight: 0, fillColor: color, fillOpacity: 0.35 }}
              />
            )}

            {self?.latitude && pred && pred.riskLevel !== 'Safe' && (
              <Polyline
                positions={[
                  [self.latitude, self.longitude],
                  [v.latitude, v.longitude],
                ]}
                pathOptions={{ color, weight: 2, opacity: 0.8 }}
              />
            )}
          </div>
        )
      })}
    </MapContainer>
  )
}
