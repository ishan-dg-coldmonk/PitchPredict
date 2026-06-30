import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL || ''

const API = axios.create({
  baseURL: BASE + '/api',
  headers: { 'Content-Type': 'application/json' },
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('pp_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pp_token')
      localStorage.removeItem('pp_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default API
