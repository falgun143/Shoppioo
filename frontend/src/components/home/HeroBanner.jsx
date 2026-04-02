import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

const BANNERS = [
  {
    id: 1,
    title: 'Induction Cooktops',
    subtitle: 'Energy-efficient cooking — top brands up to 40% off',
    cta: 'Shop Induction',
    link: '/category/induction-cooktops',
    bg: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)',
    emoji: '🔌',
    badge: 'UP TO 40% OFF',
  },
  {
    id: 2,
    title: 'Premium Firewood',
    subtitle: 'Kiln-dried & seasoned firewood — delivered to your door',
    cta: 'Shop Firewood',
    link: '/category/firewood',
    bg: 'linear-gradient(135deg, #e65100 0%, #bf360c 100%)',
    emoji: '🪵',
    badge: 'FREE DELIVERY',
  },
  {
    id: 3,
    title: 'Lakdi ka Chula',
    subtitle: 'Traditional wood cookstoves — eco-friendly & smoke-free',
    cta: 'Shop Chulas',
    link: '/category/lakdi-ka-chula',
    bg: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
    emoji: '🔥',
    badge: 'ECO-FRIENDLY',
  },
]

export default function HeroBanner() {
  return (
    <div className="relative w-full">
      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        autoplay={{ delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        pagination={{ clickable: true, dynamicBullets: true }}
        navigation
        loop
        className="w-full"
        style={{ '--swiper-navigation-color': '#ffffff', '--swiper-pagination-color': '#ffffff' }}
      >
        {BANNERS.map((banner) => (
          <SwiperSlide key={banner.id}>
            <Link to={banner.link} className="block">
              <div
                className="w-full flex items-center overflow-hidden"
                style={{
                  background: banner.bg,
                  minHeight: '220px',
                  height: 'clamp(220px, 30vw, 380px)',
                }}
              >
                <div className="max-w-7xl mx-auto px-8 sm:px-12 w-full flex items-center justify-between">
                  {/* Text Content */}
                  <div className="text-white max-w-md">
                    <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold tracking-widest px-3 py-1 rounded-full mb-3 uppercase">
                      {banner.badge}
                    </span>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight mb-2 drop-shadow">
                      {banner.title}
                    </h2>
                    <p className="text-white/90 text-sm sm:text-base mb-4 drop-shadow">
                      {banner.subtitle}
                    </p>
                    <span className="inline-flex items-center gap-2 bg-white text-gray-800 font-bold px-5 py-2.5 rounded-full text-sm hover:bg-yellow-300 transition-colors duration-200 shadow-lg">
                      {banner.cta}
                      <span>→</span>
                    </span>
                  </div>

                  {/* Emoji / Illustration */}
                  <div className="hidden sm:flex items-center justify-center">
                    <div className="text-[80px] sm:text-[120px] lg:text-[160px] select-none filter drop-shadow-lg">
                      {banner.emoji}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
