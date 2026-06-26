import { createContext, useContext, useRef, useCallback, useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const clientRef = useRef(null)
  const subscriptionsRef = useRef(new Map())
  const subIdRef = useRef(0)

  /**
   * connect — called once after successful login/signup.
   * Idempotent: if already connected, does nothing.
   */
  const connect = useCallback(() => {
    if (clientRef.current?.active) return

    const token = localStorage.getItem('pp_token')
    if (!token) return

    const client = new Client({
      webSocketFactory: () => {
        const base = import.meta.env.VITE_API_BASE_URL || ''
        return new SockJS(base + '/ws')
      },

      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      reconnectDelay: 5000,

      onConnect: () => {
        console.log('[WS] Connected')
        // Re-establish every registered subscription on (re)connect
        for (const [id, entry] of subscriptionsRef.current) {
          if (entry.sub) {
            try { entry.sub.unsubscribe() } catch (_) {}
          }
          const sub = client.subscribe(entry.destination, (message) => {
            try {
              const event = JSON.parse(message.body)
              entry.callback(event)
            } catch (e) {
              console.warn('[WS] Failed to parse message:', e)
            }
          })
          subscriptionsRef.current.set(id, { ...entry, sub })
        }
      },

      onDisconnect: () => {
        console.log('[WS] Disconnected')
      },

      onStompError: (frame) => {
        console.error('[WS] STOMP error:', frame.headers?.message)
      },

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
    subscriptionsRef.current.clear()
  }, [])

  /**
   * subscribe — subscribe to a STOMP destination.
   *
   * Registers the subscription in an internal map so it survives
   * WebSocket reconnects.  Returns an unsubscribe function.
   *
   * @param {string}   destination  e.g. '/topic/matches/42'
   * @param {function} callback     called with the parsed WebSocketEvent payload
   * @returns {function}            call this to unsubscribe
   */
  const subscribe = useCallback((destination, callback) => {
    const client = clientRef.current
    if (!client) return () => {}

    const id = ++subIdRef.current
    let sub = null

    if (client.connected) {
      sub = client.subscribe(destination, (message) => {
        try {
          const event = JSON.parse(message.body)
          callback(event)
        } catch (e) {
          console.warn('[WS] Failed to parse message:', e)
        }
      })
    }

    subscriptionsRef.current.set(id, { destination, callback, sub })

    // Return unsubscribe function
    return () => {
      const entry = subscriptionsRef.current.get(id)
      if (entry?.sub) {
        try { entry.sub.unsubscribe() } catch (_) {}
      }
      subscriptionsRef.current.delete(id)
    }
  }, [])

  // Clean up all subscriptions when provider unmounts
  useEffect(() => {
    return () => {
      subscriptionsRef.current.clear()
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ connect, disconnect, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => useContext(WebSocketContext)
