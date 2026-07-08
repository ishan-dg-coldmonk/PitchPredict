import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import GoogleButton from './GoogleButton'
import GoogleUsernameModal from './GoogleUsernameModal'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

/**
 * Drop-in Google sign-in block for the login/signup pages: an "or" divider, the
 * Google button, and the first-time "choose a username" modal. Handles the whole
 * flow and navigates to /home on success. Renders nothing if Google isn't
 * configured, so the pages stay clean without a client id.
 */
export default function GoogleAuthPanel({ label = 'Continue with Google' }) {
  const { googleAuth } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(null) // new-user data awaiting a username

  const handleToken = useCallback(async (accessToken) => {
    setBusy(true)
    try {
      const data = await googleAuth(accessToken)
      if (data.newUser) {
        setPending({ accessToken, ...data })   // open the username modal
      } else {
        toast.success('Welcome back!')
        navigate('/home')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Google sign-in failed')
    } finally {
      setBusy(false)
    }
  }, [googleAuth, navigate])

  if (!CLIENT_ID) return null

  return (
    <>
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-gray-500">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <GoogleButton onToken={handleToken} label={label} busy={busy} />

      <AnimatePresence>
        {pending && (
          <GoogleUsernameModal
            {...pending}
            onClose={() => setPending(null)}
            onDone={() => { setPending(null); navigate('/home') }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
