import { projectPosition } from './haversine'

const TYPES = ['Car', 'Bike', 'Truck', 'Bus']

function rand(min, max) {
  return Math.random() * (max - min) + min
}

/**
 * Creates a fleet of simulated vehicles clustered around a center point.
 * Used only in Development Mode - Production Mode never calls this.
 */
export function createSimulatedFleet(center, count = 30) {
  const fleet = []
  for (let i = 0; i < count; i++) {
    const isEmergency = Math.random() < 0.04
    fleet.push({
      vehicleId: `SIM${String(i).padStart(3, '0')}`,
      vehicleType: isEmergency ? 'Emergency' : TYPES[Math.floor(rand(0, TYPES.length))],
      latitude: center.lat + rand(-0.01, 0.01),
      longitude: center.lng + rand(-0.01, 0.01),
      speed: isEmergency ? rand(50, 90) : rand(5, 70),
      heading: rand(0, 360),
      acceleration: rand(-2, 2),
      brake: Math.random() < 0.1,
      behavior: Math.random() < 0.15 ? 'congested' : 'normal',
      timestamp: Date.now() / 1000,
    })
  }
  return fleet
}

/** Advances the simulated fleet by `dtSeconds`, mutating a bit of randomness in. */
export function stepSimulatedFleet(fleet, dtSeconds = 0.1) {
  return fleet.map((v) => {
    let speed = v.speed + v.acceleration * dtSeconds
    let brake = v.brake
    let acceleration = v.acceleration

    // Random events: hard brake, sudden acceleration, congestion slowdown.
    if (Math.random() < 0.01) {
      brake = true
      acceleration = -rand(3, 6)
    } else if (Math.random() < 0.01) {
      brake = false
      acceleration = rand(2, 4)
    } else if (v.behavior === 'congested') {
      speed = Math.min(speed, 15)
    } else {
      brake = false
    }

    speed = Math.max(0, Math.min(speed, v.vehicleType === 'Emergency' ? 110 : 90))

    const heading = (v.heading + rand(-4, 4) + 360) % 360
    const { latitude, longitude } = projectPosition(v.latitude, v.longitude, speed, heading, dtSeconds)

    return {
      ...v,
      latitude,
      longitude,
      speed,
      heading,
      acceleration,
      brake,
      timestamp: Date.now() / 1000,
    }
  })
}
