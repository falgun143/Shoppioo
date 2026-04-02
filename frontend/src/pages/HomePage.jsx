import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { FiShield, FiRefreshCw, FiHeadphones } from 'react-icons/fi'
import HeroBanner from '../components/home/HeroBanner'
import FeaturedProducts from '../components/home/FeaturedProducts'
import DealsSection from '../components/home/DealsSection'
import { productAPI } from '../services/api'

const TRUST_BADGES = [
  { icon: FiRefreshCw,   title: 'Easy Returns',     desc: '7-day hassle-free returns',   color: 'text-green-600',  bg: 'bg-green-50' },
  { icon: FiShield,      title: 'Secure Payments',  desc: '100% safe & protected',       color: 'text-purple-600', bg: 'bg-purple-50' },
  { icon: FiHeadphones,  title: '24/7 Support',     desc: 'Dedicated customer care',     color: 'text-orange-600', bg: 'bg-orange-50' },
]

export default function HomePage() {
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['products-featured'],
    queryFn: () => productAPI.getFeatured().then((r) => r.data),
  })

  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ['products-deals'],
    queryFn: () => productAPI.getAll({ sort: '-discountPercent', limit: 6 }).then((r) => r.data),
  })

  return (
    <>
      <Helmet>
        <title>Shoppioo - Induction Cooktops, Firewood & Lakdi ka Chula | Best Deals India</title>
        <meta
          name="description"
          content="Shop the best induction cooktops, firewood and lakdi ka chula (wood cookstoves) at Shoppioo. Free delivery above ₹499. Easy returns. 100% authentic products."
        />
      </Helmet>

      {/* Hero Banner — images managed from admin panel */}
      <HeroBanner />


      {/* Best Deals — highest discounted products from DB */}
      <div className="max-w-7xl mx-auto mt-3">
        <DealsSection
          products={dealsData?.products}
          isLoading={dealsLoading}
        />
      </div>

      {/* Featured Products — products marked isFeatured in admin panel */}
      <div className="max-w-7xl mx-auto mt-3">
        <FeaturedProducts
          title="Featured Products"
          products={featuredData?.products}
          isLoading={featuredLoading}
          viewAllLink="/products"
        />
      </div>

      {/* Trust Badges */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TRUST_BADGES.map((badge) => {
            const Icon = badge.icon
            return (
              <div
                key={badge.title}
                className="bg-white rounded-sm border border-gray-100 shadow-sm p-4 flex items-center gap-3"
              >
                <div className={`${badge.bg} ${badge.color} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{badge.title}</p>
                  <p className="text-xs text-gray-500">{badge.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
