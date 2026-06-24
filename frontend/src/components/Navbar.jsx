import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Menu, X, LogOut, User, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const links = [
    { to: '/home', label: 'Home' },
    { to: '/profile', label: 'Profile' },
  ]

  if (user?.role === 'ADMIN') {
    links.push({ to: '/admin', label: 'Admin', icon: Shield })
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">PitchPredict</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              {link.icon && <link.icon size={14} />}
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden">
              {user?.profilePic ? (
                <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={16} className="text-gray-300" />
              )}
            </div>
            <span className="text-sm text-gray-300">{user?.username}</span>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Logout">
            <LogOut size={18} className="text-gray-400" />
          </button>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {menuOpen ? <X size={22} className="text-white" /> : <Menu size={22} className="text-white" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {/* User info */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden">
                  {user?.profilePic ? (
                    <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{user?.username}</div>
                  <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                </div>
              </div>
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-gray-300 hover:bg-white/10 rounded-xl transition-colors"
                >
                  {link.icon && <link.icon size={16} />}
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => { setMenuOpen(false); handleLogout() }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
