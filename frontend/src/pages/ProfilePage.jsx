import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Shield, Calendar, Trophy, TrendingUp } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import API from '../api/axios'
import { formatDate } from '../utils/helpers'

export default function ProfilePage() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])

  useEffect(() => {
    API.get('/rooms/my').then((r) => setRooms(r.data))
  }, [])

  if (!user) return null

  const stats = [
    { icon: Trophy, label: 'Rooms Joined', value: rooms.length },
    { icon: TrendingUp, label: 'Active', value: rooms.filter((r) => r.userJoined).length },
  ]

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="pt-20 pb-12 max-w-3xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden ring-4 ring-primary/20">
              {user.profilePic ? (
                <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-gray-400" />
              )}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-white">{user.fullName || user.username}</h1>
              <p className="text-gray-400">@{user.username}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 justify-center sm:justify-start">
                <span className="flex items-center gap-1"><Mail size={14} />{user.email}</span>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.role === 'ADMIN' ? 'bg-primary/20 text-primary-light' : 'bg-white/10 text-gray-400'
                }`}>
                  <Shield size={12} />{user.role}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5 text-center"
            >
              <s.icon size={24} className="text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-white mb-4">My Rooms</h2>
        {rooms.length === 0 ? (
          <div className="glass-card p-8 text-center"><p className="text-gray-500">No rooms joined yet</p></div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <motion.div key={room.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{room.name}</h3>
                    <p className="text-xs text-gray-500">{room.memberCount} members</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
