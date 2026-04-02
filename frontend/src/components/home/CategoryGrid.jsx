import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { categoryAPI } from '../../services/api'

// Fallback icons when no image uploaded in admin panel
const CATEGORY_ICONS = {
  'induction-cooktops': { emoji: '🔌', color: 'bg-blue-100' },
  'induction-cooktop': { emoji: '🔌', color: 'bg-blue-100' },
  'firewood': { emoji: '🪵', color: 'bg-amber-100' },
  'lakdi-ka-chula': { emoji: '🔥', color: 'bg-orange-100' },
  'wood-stove': { emoji: '🔥', color: 'bg-orange-100' },
  'cookstove': { emoji: '🔥', color: 'bg-orange-100' },
}

const DEFAULT_COLOR = 'bg-gray-100'
const DEFAULT_EMOJI = '📦'

export default function CategoryGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories-home'],
    queryFn: () => categoryAPI.getAll().then((r) => r.data),
  })

  const categories = data?.categories || []

  if (isLoading) {
    return (
      <section className="bg-white py-5 px-4 sm:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-4 justify-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-gray-200" />
                <div className="w-20 h-3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) return null

  return (
    <section className="bg-white py-5 px-4 sm:px-6 shadow-sm">
      <div className="max-w-7xl mx-auto">
        <div className={`grid gap-2 ${categories.length <= 4 ? 'grid-cols-' + categories.length : 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-10'}`}
          style={categories.length <= 4 ? { gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` } : {}}
        >
          {categories.map((cat) => {
            const icon = CATEGORY_ICONS[cat.slug] || { emoji: DEFAULT_EMOJI, color: DEFAULT_COLOR }
            return (
              <Link
                key={cat._id || cat.slug}
                to={`/category/${cat.slug}`}
                className="flex flex-col items-center gap-2 p-3 sm:p-5 rounded-lg hover:bg-gray-50 transition-colors group text-center"
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center ${icon.color} group-hover:scale-110 transition-transform`}>
                  {cat.image?.url ? (
                    <img
                      src={cat.image.url}
                      alt={cat.name}
                      className="w-11 h-11 sm:w-14 sm:h-14 object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl">{icon.emoji}</span>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-primary-500 transition-colors leading-tight">
                  {cat.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
