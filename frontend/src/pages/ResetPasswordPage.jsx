import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { authAPI } from '../services/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [showCPw, setShowCPw] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const mutation = useMutation({
    mutationFn: (data) => authAPI.resetPassword({ ...data, token }),
    onSuccess: () => {
      toast.success('Password reset! Please login.')
      navigate('/login')
    },
    onError: (err) => toast.error(err.message || 'Reset failed. Link may have expired.'),
  })

  const onSubmit = (data) => {
    if (!token) { toast.error('Invalid reset link'); return }
    mutation.mutate({ newPassword: data.password, token })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-sm shadow-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <Link to="/" className="text-2xl font-bold text-primary-500">
            Shoppi<span className="text-yellow-400">oo</span>
          </Link>
        </div>
        <h2 className="text-xl font-bold mb-1">Set New Password</h2>
        <p className="text-gray-500 text-sm mb-6">Create a new strong password for your account.</p>

        {!token ? (
          <div className="text-center py-6">
            <p className="text-red-500 mb-4">Invalid or expired reset link.</p>
            <Link to="/forgot-password" className="btn-primary px-6 py-2.5 text-sm">Request New Link</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('password', {
                    required: 'Password required',
                    minLength: { value: 8, message: 'Min 8 characters' },
                  })}
                  type={showPw ? 'text' : 'password'}
                  placeholder="New password"
                  className="input-field pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('confirm', {
                    required: 'Confirm your password',
                    validate: (v) => v === watch('password') || 'Passwords do not match',
                  })}
                  type={showCPw ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  className="input-field pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowCPw(!showCPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCPw ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
            </div>

            <button type="submit" disabled={mutation.isPending}
              className="w-full btn-primary py-3 font-bold">
              {mutation.isPending ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
