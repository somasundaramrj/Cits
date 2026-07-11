import { useEffect, useRef, useState } from 'react'

/**
 * Continuously watches the browser's geolocation and derives speed/heading
 * from successive fixes when the device doesn't report them directly.
 */
export function useGeolocation({ enabled = true } = {}) {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const lastFix = useRef(null)

  useEffect(() => {
    if (!enabled) return
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported by this browser')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords
        const timestamp = pos.timestamp / 1000

        let derivedSpeed = speed
        let derivedHeading = heading

        if (lastFix.current) {
          const dt = timestamp - lastFix.current.timestamp
          if (dt > 0) {
            if (derivedSpeed == null) {
              const dist = haversine(lastFix.current.latitude, lastFix.current.longitude, latitude, longitude)
              derivedSpeed = dist / dt // m/s
            }
            if (derivedHeading == null) {
              derivedHeading = bearing(lastFix.current.latitude, lastFix.current.longitude, latitude, longitude)
            }
          }
        }

        lastFix.current = { latitude, longitude, timestamp }
        setPosition({
          latitude,
          longitude,
          speed: (derivedSpeed || 0) * 3.6, // m/s -> km/h
          heading: derivedHeading || 0,
          timestamp,
        })
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [enabled])

  return { position, error }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180
  const toDeg = (r) => (r * 180) / Math.PI
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}
