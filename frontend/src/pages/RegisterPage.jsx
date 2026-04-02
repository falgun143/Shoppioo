import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Helmet } from 'react-helmet-async'
import { FiUser, FiMail, FiLock, FiPhone, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuth } from '../hooks/useAuth'
import useAuthStore from '../store/authStore'

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { register: registerUser, isLoading } = useAuth()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const password = watch('password')

  useEffect(() => {
    if (isAuthenticated) navigate(redirect, { replace: true })
  }, [isAuthenticated, navigate, redirect])

  const onSubmit = async (data) => {
    const { confirmPassword, ...userData } = data
    await registerUser(userData)
  }

  return (
    <>
      <Helmet><title>Create Account - Shoppioo</title></Helmet>

      <div className="min-h-screen bg-gray-50 flex">
        {/* Left Branding */}
        <div className="hidden lg:flex lg:w-2/5 bg-primary-500 flex-col items-center justify-center p-12">
          <div className="text-white text-center">
            <h1 className="text-4xl font-extrabold mb-3">
              Shoppi<span className="text-yellow-300">oo</span>
            </h1>
            <p className="text-xl text-blue-200 mb-6">Join millions of happy shoppers!</p>
            <ul className="space-y-3 text-left max-w-xs">
              {[
                '📦 Track all your orders in one place',
                '❤️ Save your favourite products',
                '🔔 Get notified about the best deals',
              ].map((item) => (
                <li key={item} className="text-sm text-blue-100 flex items-start gap-2">
                  <span className="text-lg">{item.split(' ')[0]}</span>
                  <span>{item.split(' ').slice(1).join(' ')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 sm:p-8">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-6">
                <Link to="/" className="text-3xl font-extrabold text-primary-500">
                  Shoppi<span className="text-yellow-400">oo</span>
                </Link>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-1">Create Account</h2>
              <p className="text-gray-500 text-sm mb-6">Start your shopping journey today</p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('name', {
                        required: 'Name is required',
                        minLength: { value: 2, message: 'Name too short' },
                        maxLength: { value: 50, message: 'Name too long' },
                      })}
                      type="text"
                      placeholder="Your full name"
                      className="input-field pl-10"
                      autoComplete="name"
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Enter a valid email address',
                        },
                      })}
                      type="email"
                      placeholder="you@example.com"
                      className="input-field pl-10"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('phone', {
                        pattern: {
                          value: /^[6-9]\d{9}$/,
                          message: 'Enter valid 10-digit Indian mobile number',
                        },
                      })}
                      type="tel"
                      placeholder="10-digit mobile number"
                      className="input-field pl-10"
                      maxLength={10}
                      autoComplete="tel"
                    />
                  </div>
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' }
                      })}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      className="input-field pl-10 pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (value) =>
                          value === password || 'Passwords do not match',
                      })}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      className="input-field pl-10 pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Terms */}
                <p className="text-xs text-gray-500">
                  By creating an account, you agree to Shoppioo's{' '}
                  <Link to="/terms" className="text-primary-500 hover:underline">Terms of Use</Link> and{' '}
                  <Link to="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>.
                </p>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 text-base font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-600 mt-5">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-500 font-semibold hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
