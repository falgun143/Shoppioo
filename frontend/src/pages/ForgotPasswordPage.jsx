import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Helmet } from 'react-helmet-async'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FiPhone, FiArrowLeft, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { authAPI } from '../services/api'

const STEPS = { PHONE: 'phone', OTP: 'otp', RESET: 'reset', DONE: 'done' }

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(STEPS.PHONE)
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])

  const emailForm = useForm()
  const resetForm = useForm()

  const sendOtpMutation = useMutation({
    mutationFn: (phone) => authAPI.forgotPassword({ phone }),
    onSuccess: () => {
      toast.success(`OTP sent to +91 ${phone}`)
      setStep(STEPS.OTP)
    },
    onError: (err) => toast.error(err.message || 'Failed to send OTP'),
  })

  const verifyOtpMutation = useMutation({
    mutationFn: (data) => authAPI.verifyOtp(data),
    onSuccess: () => {
      toast.success('OTP verified!')
      setStep(STEPS.RESET)
    },
    onError: (err) => toast.error(err.message || 'Invalid or expired OTP'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (data) => authAPI.resetPassword(data),
    onSuccess: () => {
      toast.success('Password reset successfully!')
      setStep(STEPS.DONE)
    },
    onError: (err) => toast.error(err.message || 'Failed to reset password'),
  })

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const arr = pasted.split('')
    setOtp([...arr, ...Array(6 - arr.length).fill('')])
  }

  const handleVerifyOtp = () => {
    const otpStr = otp.join('')
    if (otpStr.length !== 6) {
      toast.error('Enter 6-digit OTP')
      return
    }
    verifyOtpMutation.mutate({ phone, otp: otpStr })
  }

  return (
    <>
      <Helmet><title>Forgot Password - Shoppioo</title></Helmet>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 sm:p-8">
            {/* Logo */}
            <div className="text-center mb-6">
              <Link to="/" className="text-2xl font-extrabold text-primary-500">
                Shoppi<span className="text-yellow-400">oo</span>
              </Link>
            </div>

            {/* Step: Phone */}
            {step === STEPS.PHONE && (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Forgot Password?</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Enter your registered mobile number. We'll send an OTP via SMS.
                </p>
                <form
                  onSubmit={emailForm.handleSubmit((data) => {
                    setPhone(data.phone)
                    sendOtpMutation.mutate(data.phone)
                  })}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <div className="relative flex">
                      <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-sm rounded-l-sm">
                        +91
                      </span>
                      <div className="relative flex-1">
                        <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          {...emailForm.register('phone', {
                            required: 'Mobile number is required',
                            pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit mobile number' },
                          })}
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="9876543210"
                          className="input-field pl-10 rounded-l-none w-full"
                        />
                      </div>
                    </div>
                    {emailForm.formState.errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{emailForm.formState.errors.phone.message}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={sendOtpMutation.isPending}
                    className="w-full btn-primary py-3 font-bold"
                  >
                    {sendOtpMutation.isPending ? 'Sending OTP...' : 'Send OTP via SMS'}
                  </button>
                </form>
              </>
            )}

            {/* Step: OTP */}
            {step === STEPS.OTP && (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Enter OTP</h2>
                <p className="text-gray-500 text-sm mb-1">
                  We sent a 6-digit OTP via SMS to <span className="font-semibold text-gray-700">+91 {phone}</span>
                </p>
                <p className="text-yellow-600 text-xs mb-6">OTP expires in 10 minutes.</p>
                <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-11 border-2 border-gray-300 rounded text-center text-lg font-bold focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  ))}
                </div>
                <button
                  onClick={handleVerifyOtp}
                  disabled={verifyOtpMutation.isPending || otp.join('').length < 6}
                  className="w-full btn-primary py-3 font-bold mb-3"
                >
                  {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button
                  onClick={() => sendOtpMutation.mutate(phone)}
                  disabled={sendOtpMutation.isPending}
                  className="w-full text-primary-500 text-sm font-medium hover:underline"
                >
                  Resend OTP
                </button>
              </>
            )}

            {/* Step: Reset Password */}
            {step === STEPS.RESET && (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">New Password</h2>
                <p className="text-gray-500 text-sm mb-6">Create a new secure password for your account.</p>
                <form
                  onSubmit={resetForm.handleSubmit((data) => {
                    resetPasswordMutation.mutate({
                      phone,
                      otp: otp.join(''),
                      newPassword: data.newPassword,
                    })
                  })}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        {...resetForm.register('newPassword', {
                          required: 'Password required',
                          minLength: { value: 8, message: 'At least 8 characters' }
                        })}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="New password"
                        className="input-field pl-10 pr-10"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                    {resetForm.formState.errors.newPassword && (
                      <p className="text-red-500 text-xs mt-1">{resetForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <div className="relative">
                      <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        {...resetForm.register('confirmPassword', {
                          required: 'Confirm your password',
                          validate: (v) => v === resetForm.watch('newPassword') || 'Passwords do not match',
                        })}
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        className="input-field pl-10 pr-10"
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showConfirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                    {resetForm.formState.errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">{resetForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                  <button type="submit" disabled={resetPasswordMutation.isPending}
                    className="w-full btn-primary py-3 font-bold">
                    {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </>
            )}

            {/* Step: Done */}
            {step === STEPS.DONE && (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Reset!</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Your password has been successfully reset. You can now login with your new password.
                </p>
                <Link to="/login" className="btn-primary px-8 py-3 inline-block font-bold">
                  Login Now
                </Link>
              </div>
            )}

            {/* Back to Login */}
            {step !== STEPS.DONE && (
              <div className="text-center mt-5">
                <Link to="/login" className="text-sm text-gray-500 hover:text-primary-500 flex items-center justify-center gap-1">
                  <FiArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
