import { haversineMeters, projectPosition } from './haversine'

export const RISK = {
  SAFE: 'Safe',
  WARNING: 'Warning',
  HIGH_RISK: 'High Risk',
  COLLISION_IMMINENT: 'Collision Imminent',
}

const RISK_DISTANCE_THRESHOLDS = {
  [RISK.COLLISION_IMMINENT]: 10, // meters
  [RISK.HIGH_RISK]: 30,
  [RISK.WARNING]: 60,
}

const HORIZONS = [1, 2, 3] // seconds, per spec

/**
 * Runs entirely on the client. Given "me" (this vehicle) and one nearby
 * vehicle, projects both forward at 1s/2s/3s, finds the closest approach,
 * and derives a risk level + naive collision probability + time-to-collision.
 *
 * This NEVER runs on the server - each client independently predicts its
 * own risk against vehicles the server told it are nearby.
 */
export function predictCollision(me, other) {
  if (!me || !other) return null

  const currentDistance = haversineMeters(me.latitude, me.longitude, other.latitude, other.longitude)

  const projections = HORIZONS.map((t) => {
    const myFuture = projectPosition(me.latitude, me.longitude, me.speed || 0, me.heading || 0, t)
    const otherFuture = projectPosition(other.latitude, other.longitude, other.speed || 0, other.heading || 0, t)
    const distance = haversineMeters(myFuture.latitude, myFuture.longitude, otherFuture.latitude, otherFuture.longitude)
    return { t, distance, myFuture, otherFuture }
  })

  const closest = projections.reduce((min, p) => (p.distance < min.distance ? p : min), {
    t: 0,
    distance: currentDistance,
  })

  const relSpeed = closingSpeed(me, other, currentDistance)
  const timeToCollision = relSpeed > 0.1 ? Math.max(currentDistance / relSpeed, 0) : Infinity

  const riskLevel = classifyRisk(closest.distance, timeToCollision)
  const probability = collisionProbability(closest.distance, timeToCollision)

  return {
    vehicleId: other.vehicleId,
    currentDistanceMeters: Math.round(currentDistance),
    closestApproach: { atSeconds: closest.t, distanceMeters: Math.round(closest.distance) },
    projections: projections.map((p) => ({
      atSeconds: p.t,
      distanceMeters: Math.round(p.distance),
      myFuture: p.myFuture,
      otherFuture: p.otherFuture,
    })),
    relativeSpeedKmh: Math.round(relSpeed * 3.6 * 10) / 10,
    timeToCollisionSeconds: Number.isFinite(timeToCollision) ? Math.round(timeToCollision * 10) / 10 : null,
    riskLevel,
    collisionProbability: probability,
  }
}

function closingSpeed(me, other, currentDistanceMeters) {
  // Approximate relative closing speed by comparing distance now vs 1s ahead.
  const meFuture = projectPosition(me.latitude, me.longitude, me.speed || 0, me.heading || 0, 1)
  const otherFuture = projectPosition(other.latitude, other.longitude, other.speed || 0, other.heading || 0, 1)
  const futureDistance = haversineMeters(meFuture.latitude, meFuture.longitude, otherFuture.latitude, otherFuture.longitude)
  const delta = currentDistanceMeters - futureDistance // positive => closing
  return Math.max(delta, 0) // meters/second
}

function classifyRisk(closestDistance, ttc) {
  if (closestDistance <= RISK_DISTANCE_THRESHOLDS[RISK.COLLISION_IMMINENT] && ttc <= 3) {
    return RISK.COLLISION_IMMINENT
  }
  if (closestDistance <= RISK_DISTANCE_THRESHOLDS[RISK.HIGH_RISK] && ttc <= 5) {
    return RISK.HIGH_RISK
  }
  if (closestDistance <= RISK_DISTANCE_THRESHOLDS[RISK.WARNING]) {
    return RISK.WARNING
  }
  return RISK.SAFE
}

function collisionProbability(closestDistance, ttc) {
  // Simple, explainable heuristic (not a validated statistical model):
  // probability rises as projected closest-approach distance shrinks and
  // time-to-collision shortens. Clamped to [0, 1].
  const distanceFactor = Math.max(0, 1 - closestDistance / 60)
  const ttcFactor = Number.isFinite(ttc) ? Math.max(0, 1 - ttc / 6) : 0
  const p = 0.6 * distanceFactor + 0.4 * ttcFactor
  return Math.round(Math.min(Math.max(p, 0), 1) * 100) / 100
}

export function riskColor(riskLevel) {
  switch (riskLevel) {
    case RISK.SAFE:
      return '#22c55e'
    case RISK.WARNING:
      return '#eab308'
    case RISK.HIGH_RISK:
      return '#f97316'
    case RISK.COLLISION_IMMINENT:
      return '#ef4444'
    default:
      return '#94a3b8'
  }
}
