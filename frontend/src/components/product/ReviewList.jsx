import { useState } from 'react'
import { FiThumbsUp, FiThumbsDown, FiUser } from 'react-icons/fi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewAPI } from '../../services/api'
import { StarDisplay } from '../common/StarRating'
import { SectionLoader } from '../common/Loader'
import { formatDistanceToNow } from 'date-fns'

function RatingBar({ stars, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-6 text-right text-gray-600">{stars}★</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${
            stars >= 4 ? 'bg-green-500' : stars === 3 ? 'bg-yellow-400' : 'bg-red-400'
          }`}
          style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
        />
      </div>
      <span className="w-8 text-gray-500 text-xs">{count || 0}</span>
    </div>
  )
}

export default function ReviewList({ productId, rating }) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('recent')

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', productId, page, sortBy],
    queryFn: () =>
      reviewAPI.getByProduct(productId, { page, limit: 5, sortBy }).then((r) => r.data),
    enabled: !!productId,
  })

  const helpfulMutation = useMutation({
    mutationFn: (reviewId) => reviewAPI.markHelpful(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
    },
  })

  const reviews = data?.reviews || []
  const totalReviews = data?.total || rating?.count || 0

  const ratingBreakdown = data?.ratingBreakdown || {
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0,
  }

  const avgRating = rating?.average || data?.averageRating || 0

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-gray-50 rounded-sm border border-gray-100">
        {/* Overall */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-900">{Number(avgRating).toFixed(1)}</div>
            <StarDisplay rating={Number(avgRating)} size="md" />
            <div className="text-sm text-gray-500 mt-1">{totalReviews.toLocaleString()} reviews</div>
          </div>
        </div>

        {/* Rating Bars */}
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <RatingBar
              key={star}
              stars={star}
              count={ratingBreakdown[star]}
              total={totalReviews}
            />
          ))}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Sort by:</span>
        {[
          { value: 'recent', label: 'Most Recent' },
          { value: 'helpful', label: 'Most Helpful' },
          { value: 'rating_high', label: 'High to Low' },
          { value: 'rating_low', label: 'Low to High' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setSortBy(opt.value); setPage(1) }}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              sortBy === opt.value
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'border-gray-300 text-gray-600 hover:border-primary-400 hover:text-primary-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Review List */}
      {isLoading ? (
        <SectionLoader text="Loading reviews..." />
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FiUser className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="border border-gray-100 rounded-sm p-4 bg-white">
              {/* Reviewer Info */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-semibold text-sm">
                      {review.user?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{review.user?.name || 'Verified Buyer'}</p>
                    <p className="text-xs text-gray-400">
                      {review.createdAt
                        ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })
                        : 'Recently'}
                    </p>
                  </div>
                </div>
                {review.verifiedPurchase && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded font-medium">
                    ✓ Verified Purchase
                  </span>
                )}
              </div>

              {/* Rating + Title */}
              <div className="flex items-center gap-2 mb-1">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold text-white ${
                  review.rating >= 4 ? 'bg-green-500' : review.rating >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                }`}>
                  {review.rating}★
                </div>
                {review.title && (
                  <span className="font-semibold text-gray-800 text-sm">{review.title}</span>
                )}
              </div>

              {/* Comment */}
              <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>

              {/* Review Images */}
              {review.images?.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {review.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="Review"
                      className="w-16 h-16 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-90"
                    />
                  ))}
                </div>
              )}

              {/* Helpful */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-500">Was this helpful?</span>
                <button
                  onClick={() => helpfulMutation.mutate(review._id)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors"
                >
                  <FiThumbsUp className="w-3.5 h-3.5" />
                  <span>Yes ({review.helpfulCount || 0})</span>
                </button>
                <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors">
                  <FiThumbsDown className="w-3.5 h-3.5" />
                  No
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {data?.hasMore && (
        <div className="text-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="border border-primary-500 text-primary-500 hover:bg-primary-50 font-semibold px-6 py-2 rounded-sm text-sm transition-colors"
          >
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  )
}
