import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, ArrowRight, Target, TrendingUp, Trophy, Users, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const features = [
  { icon: Target, title: 'Predict Scores', desc: 'Enter your exact score predictions for every match.' },
  { icon: TrendingUp, title: 'Earn Points', desc: 'Get up to 17 points per match based on accuracy.' },
  { icon: Trophy, title: 'Climb Rankings', desc: 'Compete on real-time leaderboards in your rooms.' },
  { icon: Users, title: 'Private Rooms', desc: 'Create or join rooms with friends using invite codes.' },
]

export default function LandingPage() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return <Navigate to="/home" replace />

  return (
    <div className="min-h-screen bg-navy">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <nav className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">PitchPredict</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="btn-outline text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2">Log In</Link>
          <Link to="/signup" className="btn-primary text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2">Sign Up</Link>
        </div>
      </nav>

      <section className="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 pt-16 sm:pt-20 lg:pt-2.5 pb-24 sm:pb-32 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-1.5 text-xs sm:text-sm text-primary-light mb-8">
            <Star size={14} className="hidden sm:block" />
            FIFA World Cup 2026 predictions now open!
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight mb-6">
            Predict. <span className="gradient-text">Compete.</span>{' '}
            <span className="text-glow">Conquer.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Join the ultimate football prediction platform. Predict exact scores,
            compete with friends in private rooms, and climb the leaderboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-4">
            <Link to="/signup" className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center gap-2">
              Get Started <ArrowRight size={18} className="sm:size-5" />
            </Link>
            <Link to="/login" className="btn-outline text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
              I have an account
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold gradient-text text-center mb-12"
        >
          How It Works
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card-hover p-6 text-center"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <f.icon size={24} className="text-primary-light" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-sm text-gray-600">
        &copy; {new Date().getFullYear()} PitchPredict. All rights reserved.
      </footer>
    </div>
  )
}
