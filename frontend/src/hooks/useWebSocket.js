import { useCallback, useEffect, useRef, useState } from 'react'

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'
const HEARTBEAT_INTERVAL_MS = 5000
const RECONNECT_BASE_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 15000

/**
 * Owns the single persistent WebSocket connection to the broker.
 * - Auto-reconnects with backoff.
 * - Sends heartbeat pings, tracks RTT.
 * - Exposes nearbyVehicles + events streamed from the server.
 * - Exposes `send(payload)` for vehicle state updates.
 */
export function useWebSocket(accessToken) {
  const [status, setStatus] = useState('disconnected') // disconnected | connecting | connected
  const [nearbyVehicles, setNearbyVehicles] = useState([])
  const [events, setEvents] = useState([])
  const [rtt, setRtt] = useState(null)

  const wsRef = useRef(null)
  const heartbeatRef = useRef(null)
  const reconnectAttempt = useRef(0)
  const reconnectTimer = useRef(null)
  const pingSentAt = useRef(null)
  const shouldReconnect = useRef(true)

  const connect = useCallback(() => {
    if (!accessToken) return
    setStatus('connecting')
    const url = `${WS_BASE_URL}/ws/vehicle?token=${encodeURIComponent(accessToken)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      reconnectAttempt.current = 0
      heartbeatRef.current = setInterval(() => {
        pingSentAt.current = performance.now()
        safeSend(ws, { type: 'ping', clientTime: Date.now() })
      }, HEARTBEAT_INTERVAL_MS)
    }

    ws.onmessage = (evt) => {
      let msg
      try {
        msg = JSON.parse(evt.data)
      } catch {
        return
      }
      if (msg.type === 'nearbyVehicles') {
        setNearbyVehicles(msg.vehicles || [])
      } else if (msg.type === 'pong') {
        if (pingSentAt.current) setRtt(Math.round(performance.now() - pingSentAt.current))
      } else if (msg.type === 'event') {
        setEvents((prev) => [{ ...msg.event, _id: crypto.randomUUID() }, ...prev].slice(0, 200))
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      clearInterval(heartbeatRef.current)
      if (shouldReconnect.current) scheduleReconnect()
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [accessToken])

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt.current,
      RECONNECT_MAX_DELAY_MS,
    )
    reconnectAttempt.current += 1
    reconnectTimer.current = setTimeout(connect, delay)
  }, [connect])

  useEffect(() => {
    shouldReconnect.current = true
    connect()
    return () => {
      shouldReconnect.current = false
      clearInterval(heartbeatRef.current)
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((payload) => {
    safeSend(wsRef.current, payload)
  }, [])

  return { status, nearbyVehicles, events, rtt, send }
}

function safeSend(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload))
  }
}
