import { createContext, useContext, useState, useEffect } from 'react'
import API from '../api/axios'
import { useWebSocket } from './WebSocketContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const { connect, disconnect } = useWebSocket()

  // On mount: restore from localStorage, verify token, then connect WS
  useEffect(() => {
    const stored = localStorage.getItem('pp_user')
    const token  = localStorage.getItem('pp_token')
    if (stored && token) {
      setUser(JSON.parse(stored))
      API.get('/auth/me')
        .then((res) => {
          const u = res.data
          setUser(u)
          localStorage.setItem('pp_user', JSON.stringify(u))
          // Token verified — connect WebSocket
          connect()
        })
        .catch(() => {
          localStorage.removeItem('pp_token')
          localStorage.removeItem('pp_user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Note: connect/disconnect are stable refs from useWebSocket, intentionally
  // omitted from deps to avoid re-running on every render.

  const login = async (username, password) => {
    const res  = await API.post('/auth/login', { username, password })
    const data = res.data
    localStorage.setItem('pp_token', data.token)
    localStorage.setItem('pp_user', JSON.stringify(data))
    setUser(data)
    connect()   // establish WebSocket connection after login
    return data
  }

  const signup = async (formData) => {
    const res  = await API.post('/auth/signup', formData)
    const data = res.data
    localStorage.setItem('pp_token', data.token)
    localStorage.setItem('pp_user', JSON.stringify(data))
    setUser(data)
    connect()   // establish WebSocket connection after signup
    return data
  }

  const logout = () => {
    disconnect()  // cleanly close WebSocket before clearing credentials
    localStorage.removeItem('pp_token')
    localStorage.removeItem('pp_user')
    setUser(null)
  }

  /**
   * updateProfile — patches profilePic and/or fullName on the server,
   * then syncs the returned user data into both state and localStorage.
   */
  const updateProfile = async ({ profilePic, fullName } = {}) => {
    const body = {}
    if (profilePic !== undefined) body.profilePic = profilePic
    if (fullName   !== undefined) body.fullName   = fullName

    const res  = await API.patch('/auth/profile', body)
    const data = res.data

    const merged = { ...data, token: localStorage.getItem('pp_token') }
    localStorage.setItem('pp_user', JSON.stringify(merged))
    setUser(merged)
    return merged
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
