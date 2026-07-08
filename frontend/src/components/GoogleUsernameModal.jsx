import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Loader2, Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { resizeImage } from '../utils/image'
import API from '../api/axios'

const USERNAME_RE = /^[A-Za-z0-9_]{3,50}$/

/**
 * One-time step shown after a first Google sign-in: confirm/choose a username.
 * Pre-filled with a suggestion and the imported Google avatar. Finishes signup
 * via AuthContext.googleComplete, then calls onDone (navigate into the app).
 */
export default function GoogleUsernameModal({ accessToken, suggestedUsername, fullName, profilePic, onClose, onDone }) {
  const { googleComplete } = useAuth()
  const [username, setUsername]   = useState(suggestedUsername || '')
  const [available, setAvailable] = useState(null)  // null = unknown, true/false
  const [checking, setChecking]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pic, setPic]             = useState(profilePic || null) // starts as the Google avatar
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const handlePic = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image must be under 3 MB')
      return
    }
    setUploading(true)
    try {
      setPic(await resizeImage(file))
    } catch {
      toast.error('Could not process that image')
    } finally {
      setUploading(false)
      e.target.value = '' // allow re-selecting the same file
    }
  }

  const wellFormed = USERNAME_RE.test(username.trim())

  // Debounced availability check.
  useEffect(() => {
    const u = username.trim()
    if (!USERNAME_RE.test(u)) { setAvailable(null); return }
    setChecking(true)
    const id = setTimeout(() => {
      API.get('/auth/username-available', { params: { username: u } })
        .then((r) => setAvailable(r.data.available))
        .catch(() => setAvailable(null))
        .finally(() => setChecking(false))
    }, 400)
    return () => clearTimeout(id)
  }, [username])

  const canSubmit = wellFormed && available === true && !submitting

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await googleComplete(accessToken, username.trim(), pic)
      toast.success('Welcome to PitchPredict!')
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not finish signing up')
      // A conflict likely means the name was taken between check and submit.
      if (err.response?.status === 409) setAvailable(false)
    } finally {
      setSubmitting(false)
    }
  }

  const hint = () => {
    const u = username.trim()
    if (u.length === 0) return { text: 'Pick a username', cls: 'text-gray-500' }
    if (!wellFormed)    return { text: '3–50 chars: letters, numbers, underscores', cls: 'text-amber-400' }
    if (checking)       return { text: 'Checking…', cls: 'text-gray-400' }
    if (available === true)  return { text: 'Available', cls: 'text-accent' }
    if (available === false) return { text: 'Already taken', cls: 'text-red-400' }
    return { text: '', cls: '' }
  }
  const h = hint()

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="glass-card p-6 w-full max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded-lg transition-colors">
          <X size={18} className="text-gray-400" />
        </button>

        <h2 className="text-lg font-bold text-white mb-1">Finish setting up</h2>
        <p className="text-xs text-gray-500 mb-5">Choose a username and photo to complete your account</p>

        {/* Avatar — tap to upload your own; defaults to the Google picture */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative w-20 h-20 rounded-full mx-auto mb-2 flex items-center justify-center bg-gradient-to-br from-primary/30 to-secondary/30 text-white text-2xl font-bold overflow-hidden ring-2 ring-white/10 hover:ring-primary/50 transition-all"
        >
          {pic
            ? <img src={pic} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            : (fullName?.[0]?.toUpperCase() ?? '?')}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading
              ? <Loader2 size={18} className="animate-spin text-white" />
              : <Camera size={18} className="text-white" />}
          </span>
        </button>
        <div className="text-[11px] text-gray-500 mb-5">Tap the photo to change it</div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePic} className="hidden" />

        <div className="text-left">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Username"
            autoFocus
            className="input-field"
          />
          <div className={`flex items-center gap-1.5 text-xs mt-1.5 ml-1 ${h.cls}`}>
            {available === true && !checking && <Check size={12} />}
            {checking && <Loader2 size={12} className="animate-spin" />}
            {h.text}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="btn-primary w-full mt-5 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : 'Continue'}
        </button>
      </motion.div>
    </motion.div>
  )
}
