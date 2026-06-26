import { createContext, useContext, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const WebSocketContext = createContext(null)

/**
 * WebSocketProvider
 *
 * Manages the single STOMP client for the entire app.
 * Provides connect(), disconnect(), and subscribe() to consumers.
 *
 * Usage:
 *   const { subscribe } = useWebSocket()
 *
 *   useEffect(() => {
 *     const unsub = subscribe('/topic/matches/42', (event) => {
 *       // event = { type: 'MATCH_UPDATED', payload: matchDTO }
 *       handleUpdate(event)
 *     })
 *     return unsub   // call on unmount to unsubscribe
 *   }, [subscribe])
 */
export function WebSocketProvider({ children }) {
  const clientRef = useRef(null)

  /**
   * connect — called once after successful login/signup.
   * Idempotent: if already connected, does nothing.
   */
  const connect = useCallback(() => {
    if (clientRef.current?.active) return

    const token = localStorage.getItem('pp_token')
    if (!token) return

    const client = new Client({
      // SockJS as the transport factory — falls back gracefully if native ws
      // is blocked (common in corporate networks and some browser envs)
      webSocketFactory: () => new SockJS('/ws'),

      // Pass JWT in STOMP CONNECT frame headers so the backend can
      // authenticate the WS session (currently /ws is open, but this
      // future-proofs it for per-session auth if needed later)
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      reconnectDelay: 5000,   // auto-reconnect after 5s if connection drops

      onConnect: () => {
        console.log('[WS] Connected')
      },

      onDisconnect: () => {
        console.log('[WS] Disconnected')
      },

      onStompError: (frame) => {
        console.error('[WS] STOMP error:', frame.headers?.message)
      },

      // Suppress verbose debug logs in production
      debug: import.meta.env.DEV ? (msg) => console.debug('[WS]', msg) : () => {},
    })

    client.activate()
    clientRef.current = client
  }, [])

  /**
   * disconnect — called on logout.
   */
  const disconnect = useCallback(() => {
    if (clientRef.current?.active) {
      clientRef.current.deactivate()
      clientRef.current = null
      console.log('[WS] Manually disconnected')
    }
  }, [])

  /**
   * subscribe — subscribe to a STOMP destination.
   *
   * Returns an unsubscribe function to be called on component unmount.
   *
   * If the client is not yet connected, the subscription is registered
   * via onConnect so it fires once the connection is established.
   *
   * @param {string}   destination  e.g. '/topic/matches/42'
   * @param {function} callback     called with the parsed WebSocketEvent payload
   * @returns {function}            call this to unsubscribe
   */
  const subscribe = useCallback((destination, callback) => {
    const client = clientRef.current
    if (!client) return () => {}

    let subscription = null

    const doSubscribe = () => {
      subscription = client.subscribe(destination, (message) => {
        try {
          const event = JSON.parse(message.body)
          callback(event)
        } catch (e) {
          console.warn('[WS] Failed to parse message:', e)
        }
      })
    }

    if (client.connected) {
      doSubscribe()
    } else {
      // Queue subscription to fire once connection is established
      const originalOnConnect = client.onConnect
      client.onConnect = (frame) => {
        if (originalOnConnect) originalOnConnect(frame)
        doSubscribe()
      }
    }

    // Return unsubscribe function
    return () => {
      if (subscription) {
        try { subscription.unsubscribe() } catch (_) {}
      }
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ connect, disconnect, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => useContext(WebSocketContext)
