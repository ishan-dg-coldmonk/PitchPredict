import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  if (loading) return null
  if (user) return <Navigate to="/home" replace />

  const validate = () => {
    const errs = {}
    if (!username.trim()) errs.username = 'Username is required'
    if (!password) errs.password = 'Password is required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      // Show the first error as a toast too
      toast.error(Object.values(errs)[0])
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      toast.success('Welcome back!')
      navigate('/home')
    } catch (err) {
      const msg = err.response?.data?.error || 'Incorrect username or password'
      toast.error(msg)
      // Highlight the password field on auth failure
      setErrors({ password: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (field) =>
    `input-field ${errors[field] ? 'border-red-500/60 focus:border-red-500/80 focus:ring-red-500/20' : ''}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-light to-navy-lighter flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-20 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-md relative z-10"
      >
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">PitchPredict</span>
        </Link>

        <h1 className="text-2xl font-bold text-white text-center mb-6">Welcome Back</h1>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, username: '' })) }}
              className={fieldClass('username')}
              autoComplete="username"
              autoFocus
            />
            {errors.username && (
              <p className="text-red-400 text-xs mt-1 ml-1">{errors.username}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })) }}
                className={`${fieldClass('password')} pr-12`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1 ml-1">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center mt-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : 'Log In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary hover:text-primary-light transition-colors">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
