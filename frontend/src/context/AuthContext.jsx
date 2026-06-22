import { createContext, useContext, useState, useEffect } from 'react'
import API from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('pp_user')
    const token = localStorage.getItem('pp_token')
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
    const res = await API.post('/auth/login', { username, password })
    const data = res.data
    localStorage.setItem('pp_token', data.token)
    localStorage.setItem('pp_user', JSON.stringify(data))
    setUser(data)
    return data
  }

  const signup = async (formData) => {
    const res = await API.post('/auth/signup', formData)
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

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
