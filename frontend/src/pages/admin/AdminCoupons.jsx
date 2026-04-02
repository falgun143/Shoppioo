import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { FiPlus, FiEdit2, FiTrash2, FiPercent, FiX } from 'react-icons/fi'
import { couponAPI } from '../../services/api'
import { TableRowSkeleton } from '../../components/common/Loader'
import { format } from 'date-fns'
import { formatPrice } from '../../components/common/PriceDisplay'

function CouponModal({ coupon, onClose, onSave, isLoading }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      code: coupon?.code || '',
      type: coupon?.type || 'percentage',
      value: coupon?.value || '',
      minOrderAmount: coupon?.minOrderAmount || '',
      maxDiscount: coupon?.maxDiscount || '',
      usageLimit: coupon?.usageLimit || '',
      expiresAt: coupon?.expiresAt ? format(new Date(coupon.expiresAt), 'yyyy-MM-dd') : '',
      isActive: coupon?.isActive !== false,
      description: coupon?.description || '',
    },
  })

  const type = watch('type')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-sm shadow-xl max-w-lg w-full p-6 my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800 text-lg">
            {coupon ? 'Edit Coupon' : 'Create Coupon'}
          </h3>
          <button onClick={onClose}><FiX className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coupon Code <span className="text-red-500">*</span>
              </label>
              <input
                {...register('code', {
                  required: 'Code required',
                  minLength: { value: 3, message: 'Min 3 chars' },
                })}
                type="text"
                placeholder="e.g., SAVE50"
                className="input-field uppercase"
                style={{ textTransform: 'uppercase' }}
              />
              <p className="text-red-500 text-xs mt-1 h-4">{errors.code?.message || ''}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
              <select {...register('type')} className="input-field">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'percentage' ? 'Discount Percentage' : 'Discount Value'} <span className="text-red-500">*</span>
              </label>
              <input
                {...register('value', {
                  required: 'Value required',
                  min: { value: 1, message: 'Must be > 0' },
                  max: type === 'percentage' ? { value: 100, message: 'Max 100%' } : undefined,
                })}
                type="number"
                placeholder={type === 'percentage' ? '10' : '100'}
                className="input-field"
              />
              <p className="text-red-500 text-xs mt-1 h-4">{errors.value?.message || ''}</p>
            </div>

            {type === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
                <input
                  {...register('maxDiscount', { min: { value: 0, message: 'Must be >= 0' } })}
                  type="number"
                  placeholder="e.g., 500"
                  className="input-field"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (₹)</label>
              <input
                {...register('minOrderAmount', { min: { value: 0 } })}
                type="number"
                placeholder="e.g., 500"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
              <input
                {...register('usageLimit', { min: { value: 1 } })}
                type="number"
                placeholder="e.g., 100 (blank = unlimited)"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <input
              {...register('expiresAt')}
              type="date"
              min={new Date().toISOString().split('T')[0]}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (internal)</label>
            <input {...register('description')} type="text" placeholder="e.g., New Year Sale 2025" className="input-field" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('isActive')} type="checkbox" className="w-4 h-4 text-primary-500 rounded" />
            <span className="text-sm text-gray-700">Coupon is active</span>
          </label>

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading} className="flex-1 btn-primary py-2.5 text-sm">
              {isLoading ? 'Saving...' : coupon ? 'Update Coupon' : 'Create Coupon'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-sm text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminCoupons() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => couponAPI.getAll().then((r) => r.data),
  })

  const coupons = data?.coupons || []

  const createMutation = useMutation({
    mutationFn: (d) => couponAPI.create(d),
    onSuccess: () => {
      toast.success('Coupon created!')
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      setShowModal(false)
    },
    onError: (err) => toast.error(err.message || 'Failed to create coupon'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => couponAPI.update(id, data),
    onSuccess: () => {
      toast.success('Coupon updated!')
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      setEditingCoupon(null)
      setShowModal(false)
    },
    onError: (err) => toast.error(err.message || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => couponAPI.delete(id),
    onSuccess: () => {
      toast.success('Coupon deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      setDeleteConfirm(null)
    },
    onError: (err) => toast.error(err.message || 'Failed'),
  })

  const handleSave = (formData) => {
    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const formatDiscount = (coupon) => {
    if (coupon.type === 'percentage') return `${coupon.value}%${coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ''}`
    if (coupon.type === 'fixed') return formatPrice(coupon.value)
    return 'Free Shipping'
  }

  return (
    <>
      <Helmet><title>Coupons - Admin | Shoppioo</title></Helmet>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Coupons</h1>
            <p className="text-sm text-gray-500">{coupons.length} coupons</p>
          </div>
          <button
            onClick={() => { setEditingCoupon(null); setShowModal(true) }}
            className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm"
          >
            <FiPlus className="w-4 h-4" />
            New Coupon
          </button>
        </div>

        <div className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Discount</th>
                  <th className="text-left px-4 py-3">Min Order</th>
                  <th className="text-left px-4 py-3">Usage</th>
                  <th className="text-left px-4 py-3">Expires</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
                ) : coupons.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      <FiPercent className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      No coupons created yet
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {coupon.code}
                        </span>
                        {coupon.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{coupon.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">{coupon.type?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 font-medium text-green-700">{formatDiscount(coupon)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {coupon.minOrderAmount ? formatPrice(coupon.minOrderAmount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {coupon.usedCount || 0}
                        {coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {coupon.expiresAt ? format(new Date(coupon.expiresAt), 'dd MMM yyyy') : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditingCoupon(coupon); setShowModal(true) }}
                            className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-blue-50 rounded"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(coupon)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <CouponModal
          coupon={editingCoupon}
          onClose={() => { setShowModal(false); setEditingCoupon(null) }}
          onSave={handleSave}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold text-gray-800 mb-2">Delete Coupon?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Delete coupon <span className="font-mono font-bold">{deleteConfirm.code}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => deleteMutation.mutate(deleteConfirm._id)} disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-sm text-sm hover:bg-red-600">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-sm text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
