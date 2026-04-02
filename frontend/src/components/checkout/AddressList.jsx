import { useState } from 'react'
import { FiMapPin, FiEdit2, FiTrash2, FiPlus, FiCheckCircle } from 'react-icons/fi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import AddressForm from './AddressForm'

export default function AddressList({ selectedId, onSelect }) {
  const queryClient = useQueryClient()
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => authAPI.getAddresses().then((r) => r.data),
  })

  const addresses = data?.addresses || []

  const addMutation = useMutation({
    mutationFn: (data) => authAPI.addAddress(data),
    onSuccess: (res) => {
      toast.success('Address saved!')
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      setIsAddingNew(false)
      if (onSelect) onSelect(res.data.address)
    },
    onError: (err) => toast.error(err.message || 'Failed to save address'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => authAPI.updateAddress(id, data),
    onSuccess: () => {
      toast.success('Address updated!')
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      setEditingId(null)
    },
    onError: (err) => toast.error(err.message || 'Failed to update address'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => authAPI.deleteAddress(id),
    onSuccess: () => {
      toast.success('Address removed')
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
    },
    onError: (err) => toast.error(err.message || 'Failed to delete address'),
  })

  if (isLoading) {
    return <div className="animate-pulse space-y-3">
      {[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded" />)}
    </div>
  }

  return (
    <div className="space-y-3">
      {addresses.map((addr) => (
        <div key={addr._id}>
          {editingId === addr._id ? (
            <div className="border border-primary-300 rounded-sm p-4 bg-blue-50">
              <AddressForm
                defaultValues={addr}
                onSubmit={(data) => updateMutation.mutate({ id: addr._id, data })}
                onCancel={() => setEditingId(null)}
                isLoading={updateMutation.isPending}
              />
            </div>
          ) : (
            <div
              className={`border rounded-sm p-4 cursor-pointer transition-all ${
                selectedId === addr._id
                  ? 'border-primary-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              onClick={() => onSelect?.(addr)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {/* Radio / Check */}
                  <div className="mt-0.5 flex-shrink-0">
                    {selectedId === addr._id ? (
                      <FiCheckCircle className="w-5 h-5 text-primary-500" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>

                  {/* Address Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">{addr.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase font-medium">
                        {addr.type || 'home'}
                      </span>
                      {addr.isDefault && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {addr.addressLine1}
                      {addr.addressLine2 && `, ${addr.addressLine2}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                    <p className="text-sm text-gray-600">Mobile: {addr.phone}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingId(addr._id) }}
                    className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded transition-colors"
                    title="Edit address"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm('Remove this address?')) {
                        deleteMutation.mutate(addr._id)
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Delete address"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add New Address */}
      {isAddingNew ? (
        <div className="border border-dashed border-primary-300 rounded-sm p-4 bg-blue-50">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FiMapPin className="text-primary-500" /> Add New Delivery Address
          </h4>
          <AddressForm
            onSubmit={(data) => addMutation.mutate(data)}
            onCancel={() => setIsAddingNew(false)}
            isLoading={addMutation.isPending}
            defaultValues={{ type: 'home' }}
          />
        </div>
      ) : (
        <button
          onClick={() => setIsAddingNew(true)}
          className="w-full border-2 border-dashed border-gray-300 hover:border-primary-400 text-primary-500 hover:bg-blue-50 rounded-sm py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-all"
        >
          <FiPlus className="w-4 h-4" />
          Add New Address
        </button>
      )}
    </div>
  )
}
