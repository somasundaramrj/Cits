export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Project a lat/lng forward by `seconds` given speed (km/h) and heading (deg). */
export function projectPosition(lat, lon, speedKmh, headingDeg, seconds) {
  const speedMs = speedKmh / 3.6
  const distance = speedMs * seconds
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const toDeg = (r) => (r * 180) / Math.PI
  const brng = toRad(headingDeg)
  const lat1 = toRad(lat)
  const lon1 = toRad(lon)

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / R) + Math.cos(lat1) * Math.sin(distance / R) * Math.cos(brng),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distance / R) * Math.cos(lat1),
      Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2),
    )

  return { latitude: toDeg(lat2), longitude: toDeg(lon2) }
}
