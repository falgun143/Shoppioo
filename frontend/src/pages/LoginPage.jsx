import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Helmet } from 'react-helmet-async'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { login, isLoading } = useAuth()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    if (isAuthenticated) navigate(redirect, { replace: true })
  }, [isAuthenticated, navigate, redirect])

  const onSubmit = async (data) => {
    await login(data, redirect)
  }

  return (
    <>
      <Helmet><title>Login - Shoppioo</title></Helmet>

      <div className="min-h-screen bg-gray-50 flex">
        {/* Left: Branding */}
        <div className="hidden lg:flex lg:w-2/5 bg-primary-500 flex-col items-center justify-center p-12">
          <div className="text-white text-center">
            <h1 className="text-4xl font-extrabold mb-3">
              Shoppi<span className="text-yellow-300">oo</span>
            </h1>
            <p className="text-xl text-blue-200 font-medium mb-6">
              India's favourite online shopping destination
            </p>
            <div className="space-y-3 text-left max-w-xs">
              {[
                '🚀 Millions of products',
                '🎁 Exclusive deals every day',
                '🔒 100% secure checkout'
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-blue-100">
                  <span className="text-lg">{item.split(' ')[0]}</span>
                  <span className="text-sm">{item.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 sm:p-8">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-6">
                <Link to="/" className="text-3xl font-extrabold text-primary-500">
                  Shoppi<span className="text-yellow-400">oo</span>
                </Link>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome back!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Login to your account to continue shopping
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
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
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary-500 hover:underline font-medium"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' },
                      })}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="input-field pl-10 pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <input
                    {...register('rememberMe')}
                    type="checkbox"
                    id="rememberMe"
                    className="w-4 h-4 text-primary-500 rounded border-gray-300"
                  />
                  <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
                    Remember me for 30 days
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 text-base font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing in...' : 'Login'}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <hr className="flex-1 border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">OR</span>
                <hr className="flex-1 border-gray-200" />
              </div>

              {/* Guest Note */}
              <p className="text-center text-sm text-gray-600">
                New to Shoppioo?{' '}
                <Link
                  to={`/register${redirect !== '/' ? `?redirect=${redirect}` : ''}`}
                  className="text-primary-500 font-semibold hover:underline"
                >
                  Create Account
                </Link>
              </p>

              <p className="text-center text-xs text-gray-400 mt-4">
                By continuing, you agree to Shoppioo's{' '}
                <Link to="/terms" className="hover:underline">Terms of Use</Link> &{' '}
                <Link to="/privacy" className="hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
