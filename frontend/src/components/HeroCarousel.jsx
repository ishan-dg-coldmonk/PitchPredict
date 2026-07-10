import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade } from 'swiper/modules'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import CountdownTimer from './CountdownTimer'
import { STATUS_COLORS } from '../utils/constants'
import { formatDate } from '../utils/helpers'
import 'swiper/css'
import 'swiper/css/effect-fade'

export default function HeroCarousel({ events }) {
  const heroEvents = events.filter((e) => e.status === 'ACTIVE' || e.status === 'UPCOMING')

  if (heroEvents.length === 0) return null

  return (
    <Swiper
      modules={[Autoplay, EffectFade]}
      effect="fade"
      autoplay={{ delay: 6000, disableOnInteraction: false }}
      loop={heroEvents.length > 1}
      className="w-full h-[300px] sm:h-[400px] md:h-[550px] rounded-2xl overflow-hidden"
    >
      {heroEvents.map((event) => {
        const colors = STATUS_COLORS[event.status]
        return (
          <SwiperSlide key={event.id}>
            <div className="relative w-full h-full">
              {event.bannerUrl ? (
                <img src={event.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-navy-light to-secondary/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-navy/30" />

              <div className="relative h-full flex flex-col justify-center px-6 sm:px-8 md:px-16 max-w-2xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <span className={`inline-flex px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold border mb-2 sm:mb-4 ${colors.bg} ${colors.text} ${colors.border}`}>
                    {event.status}
                  </span>
                  <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 sm:mb-4 leading-tight">
                    {event.title}
                  </h2>
                  {event.description && (
                    <p className="text-xs sm:text-base text-gray-300 mb-2 sm:mb-4 line-clamp-2">{event.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
                    <span>{formatDate(event.startDate)} – {formatDate(event.endDate)}</span>
                    <span>{event.roomCount || 0} rooms</span>
                  </div>

                  {event.status === 'UPCOMING' && event.startDate && (
                    <div className="mb-6">
                      <CountdownTimer targetDate={event.startDate} />
                    </div>
                  )}

                  <Link to={`/events/${event.id}`} className="btn-primary inline-flex items-center gap-2 !text-sm !px-4 !py-2 sm:!text-base sm:!px-6 sm:!py-3">
                    View Event <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </SwiperSlide>
        )
      })}
    </Swiper>
  )
}
