import { useState, useRef } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Eye, EyeOff, Camera, Home } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const { user, signup, loading } = useAuth()
  const navigate = useNavigate()
  const fileRef  = useRef()
  const [form, setForm] = useState({
    fullName: '', username: '', email: '', password: '', profilePic: '',
  })
  const [showPw, setShowPw]         = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]         = useState({})

  if (loading) return null
  if (user) return <Navigate to="/home" replace />

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    const reader = new FileReader()
    reader.onload = () => set('profilePic', reader.result)
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const errs = {}
    if (!form.username.trim())              errs.username = 'Username is required'
    else if (form.username.trim().length < 3) errs.username = 'Username must be at least 3 characters'
    if (!form.email.trim())                  errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.password)                      errs.password = 'Password is required'
    else if (form.password.length < 6)       errs.password = 'Password must be at least 6 characters'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error(Object.values(errs)[0])
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      await signup(form)
      toast.success('Account created! Welcome 🎉')
      navigate('/home')
    } catch (err) {
      const msg = err.response?.data?.error || 'Signup failed. Please try again.'
      toast.error(msg)
      if (msg.toLowerCase().includes('username')) setErrors({ username: msg })
      else if (msg.toLowerCase().includes('email')) setErrors({ email: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (field) =>
    `input-field ${errors[field] ? 'border-red-500/60 focus:border-red-500/80 focus:ring-red-500/20' : ''}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-light to-navy-lighter flex items-center justify-center p-4">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-20 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      {/* Home button — top left */}
      <Link
        to="/"
        className="fixed top-5 left-5 z-20 flex items-center gap-1.5 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-all duration-200"
      >
        <Home size={15} />
        Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">PitchPredict</span>
        </Link>

        <h1 className="text-2xl font-bold text-white text-center mb-6">Create Account</h1>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {/* Avatar */}
          <div className="flex justify-center mb-2">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors overflow-hidden ring-4 ring-primary/30"
            >
              {form.profilePic
                ? <img src={form.profilePic} alt="" className="w-full h-full object-cover" />
                : <Camera size={24} className="text-gray-500" />
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>

          {/* Full name */}
          <input
            type="text"
            placeholder="Full Name (optional)"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            className="input-field"
            autoComplete="name"
          />

          {/* Username */}
          <div>
            <input
              type="text"
              placeholder="Username *"
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              className={fieldClass('username')}
              autoComplete="username"
              autoFocus
            />
            {errors.username && <p className="text-red-400 text-xs mt-1 ml-1">{errors.username}</p>}
          </div>

          {/* Email */}
          <div>
            <input
              type="email"
              placeholder="Email *"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={fieldClass('email')}
              autoComplete="email"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password (min 6 characters) *"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                className={`${fieldClass('password')} pr-12`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1 ml-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center mt-1"
          >
            {submitting
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Create Account'
            }
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-primary-light transition-colors">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
