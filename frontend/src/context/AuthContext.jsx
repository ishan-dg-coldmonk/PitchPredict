import { createContext, useContext, useState, useEffect } from 'react'
import API from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: restore from localStorage, then verify token with /me
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
  }, [])

  const login = async (username, password) => {
    const res  = await API.post('/auth/login', { username, password })
    const data = res.data
    localStorage.setItem('pp_token', data.token)
    localStorage.setItem('pp_user', JSON.stringify(data))
    setUser(data)
    return data
  }

  const signup = async (formData) => {
    const res  = await API.post('/auth/signup', formData)
    const data = res.data
    localStorage.setItem('pp_token', data.token)
    localStorage.setItem('pp_user', JSON.stringify(data))
    setUser(data)
    return data
  }

  const logout = () => {
    localStorage.removeItem('pp_token')
    localStorage.removeItem('pp_user')
    setUser(null)
  }

  /**
   * updateProfile — patches profilePic and/or fullName on the server,
   * then syncs the returned user data into both state and localStorage
   * so Navbar, ProfilePage, and any other consumer immediately reflect
   * the new avatar without a page refresh.
   *
   * Pass only the fields you want to change; omit the rest.
   */
  const updateProfile = async ({ profilePic, fullName } = {}) => {
    const body = {}
    if (profilePic !== undefined) body.profilePic = profilePic
    if (fullName   !== undefined) body.fullName   = fullName

    const res  = await API.patch('/auth/profile', body)
    const data = res.data

    // Preserve the existing token — the PATCH endpoint doesn't return one
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
