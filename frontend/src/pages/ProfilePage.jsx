import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FiUser, FiMail, FiPhone, FiLock, FiEdit2, FiCamera, FiMapPin } from 'react-icons/fi'
import { authAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { useAuth } from '../hooks/useAuth'
import AddressForm from '../components/checkout/AddressForm'
import AddressList from '../components/checkout/AddressList'

const TABS = ['Personal Info', 'Saved Addresses', 'Change Password']

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('Personal Info')
  const { user, updateUser } = useAuthStore()
  const { changePassword } = useAuth()
  const queryClient = useQueryClient()

  const profileForm = useForm({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    },
  })

  const passwordForm = useForm()

  const updateProfileMutation = useMutation({
    mutationFn: (data) => authAPI.updateProfile(data),
    onSuccess: (res) => {
      updateUser(res.data.user)
      toast.success('Profile updated!')
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err) => toast.error(err.message || 'Update failed'),
  })

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    const formData = new FormData()
    formData.append('avatar', file)
    try {
      const { data } = await authAPI.updateAvatar(formData)
      updateUser({ avatar: data.avatar })
      toast.success('Avatar updated!')
    } catch (err) {
      toast.error(err.message || 'Failed to update avatar')
    }
  }

  const handleChangePassword = async (data) => {
    const result = await changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    })
    if (result.success) passwordForm.reset()
  }

  return (
    <>
      <Helmet><title>My Profile - Shoppioo</title></Helmet>

      <div className="bg-gray-50 min-h-screen py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">My Account</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="md:col-span-1">
              {/* Avatar */}
              <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4 mb-4 text-center">
                <div className="relative inline-block mb-3">
                  <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-3xl font-bold">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-full p-1.5 cursor-pointer shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <FiCamera className="w-3.5 h-3.5 text-gray-600" />
                  </label>
                  <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <p className="font-semibold text-gray-800 text-sm">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>

              {/* Nav Tabs */}
              <div className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden">
                {TABS.map((tab) => {
                  const icons = { 'Personal Info': FiUser, 'Saved Addresses': FiMapPin, 'Change Password': FiLock }
                  const Icon = icons[tab]
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-2.5 w-full text-left px-4 py-3 text-sm border-b border-gray-50 last:border-0 transition-colors ${
                        activeTab === tab
                          ? 'bg-primary-50 text-primary-600 font-semibold border-l-2 border-l-primary-500'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Main Content */}
            <div className="md:col-span-3">
              <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5 sm:p-6">
                {/* Personal Info */}
                {activeTab === 'Personal Info' && (
                  <>
                    <h2 className="font-bold text-gray-800 text-lg mb-5 flex items-center gap-2">
                      <FiUser className="text-primary-500" /> Personal Information
                    </h2>
                    <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <div className="relative">
                          <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            {...profileForm.register('name', { required: 'Name required', minLength: { value: 2, message: 'Too short' } })}
                            className="input-field pl-10"
                          />
                        </div>
                        {profileForm.formState.errors.name && (
                          <p className="text-red-500 text-xs mt-1">{profileForm.formState.errors.name.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="relative">
                          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            value={user?.email || ''}
                            disabled
                            className="input-field pl-10 bg-gray-50 text-gray-500 cursor-not-allowed"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                        <div className="relative">
                          <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            {...profileForm.register('phone', {
                              pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit mobile' },
                            })}
                            type="tel"
                            placeholder="10-digit mobile number"
                            className="input-field pl-10"
                            maxLength={10}
                          />
                        </div>
                        {profileForm.formState.errors.phone && (
                          <p className="text-red-500 text-xs mt-1">{profileForm.formState.errors.phone.message}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"
                      >
                        <FiEdit2 className="w-4 h-4" />
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                    </form>
                  </>
                )}

                {/* Saved Addresses */}
                {activeTab === 'Saved Addresses' && (
                  <>
                    <h2 className="font-bold text-gray-800 text-lg mb-5 flex items-center gap-2">
                      <FiMapPin className="text-primary-500" /> Saved Addresses
                    </h2>
                    <AddressList selectedId={null} onSelect={() => {}} />
                  </>
                )}

                {/* Change Password */}
                {activeTab === 'Change Password' && (
                  <>
                    <h2 className="font-bold text-gray-800 text-lg mb-5 flex items-center gap-2">
                      <FiLock className="text-primary-500" /> Change Password
                    </h2>
                    <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4 max-w-sm">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input
                          {...passwordForm.register('currentPassword', { required: 'Current password required' })}
                          type="password"
                          placeholder="Enter current password"
                          className="input-field"
                        />
                        {passwordForm.formState.errors.currentPassword && (
                          <p className="text-red-500 text-xs mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                          {...passwordForm.register('newPassword', {
                            required: 'New password required',
                            minLength: { value: 8, message: 'At least 8 characters' },
                          })}
                          type="password"
                          placeholder="New password"
                          className="input-field"
                        />
                        {passwordForm.formState.errors.newPassword && (
                          <p className="text-red-500 text-xs mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input
                          {...passwordForm.register('confirmPassword', {
                            required: 'Confirm your password',
                            validate: (v) => v === passwordForm.watch('newPassword') || 'Passwords do not match',
                          })}
                          type="password"
                          placeholder="Confirm new password"
                          className="input-field"
                        />
                        {passwordForm.formState.errors.confirmPassword && (
                          <p className="text-red-500 text-xs mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                        )}
                      </div>
                      <button type="submit" className="btn-primary px-6 py-2.5 text-sm">
                        Update Password
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
