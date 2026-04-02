import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { reviewAPI } from '../../services/api'
import { StarInput } from '../common/StarRating'
import useAuthStore from '../../store/authStore'

export default function ReviewForm({ productId, existingReview, onClose }) {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [ratingError, setRatingError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      title: existingReview?.title || '',
      comment: existingReview?.comment || '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data) =>
      existingReview
        ? reviewAPI.update(existingReview._id, data)
        : reviewAPI.create({ ...data, productId }),
    onSuccess: () => {
      toast.success(existingReview ? 'Review updated!' : 'Review submitted! Thank you.')
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      reset()
      setRating(0)
      onClose?.()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit review')
    },
  })

  const onSubmit = (data) => {
    if (!rating) {
      setRatingError('Please select a rating')
      return
    }
    setRatingError('')
    mutation.mutate({ ...data, rating })
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-gray-50 rounded-sm border border-gray-200 p-6 text-center">
        <p className="text-gray-600 mb-3">Please login to write a review</p>
        <a
          href="/login"
          className="inline-block bg-primary-500 text-white px-5 py-2 rounded-sm text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Login to Review
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-5">
      <h3 className="font-semibold text-gray-800 mb-4 text-base">
        {existingReview ? 'Edit Your Review' : 'Write a Review'}
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Overall Rating <span className="text-red-500">*</span>
          </label>
          <StarInput value={rating} onChange={(r) => { setRating(r); setRatingError('') }} />
          {ratingError && (
            <p className="text-red-500 text-xs mt-1">{ratingError}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Review Title
          </label>
          <input
            {...register('title', { maxLength: { value: 100, message: 'Max 100 characters' } })}
            type="text"
            placeholder="Summarize your experience..."
            className="input-field"
          />
          {errors.title && (
            <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Review <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('comment', {
              required: 'Please write your review',
              minLength: { value: 20, message: 'Review must be at least 20 characters' },
              maxLength: { value: 2000, message: 'Review must be under 2000 characters' },
            })}
            rows={4}
            placeholder="Share your experience with this product... What did you like or dislike? What would you recommend to others?"
            className="input-field resize-none"
          />
          {errors.comment && (
            <p className="text-red-500 text-xs mt-1">{errors.comment.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary px-6 py-2 text-sm"
          >
            {mutation.isPending
              ? 'Submitting...'
              : existingReview
              ? 'Update Review'
              : 'Submit Review'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-6 py-2 rounded-sm text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
