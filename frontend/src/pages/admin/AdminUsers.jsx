import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { FiSearch, FiPlus, FiX, FiTrash2 } from 'react-icons/fi'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { adminAPI } from '../../services/api'
import Pagination from '../../components/common/Pagination'
import { TableRowSkeleton } from '../../components/common/Loader'
import { format } from 'date-fns'
import useDebounce from '../../hooks/useDebounce'

function CreateUserModal({ onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    defaultValues: { role: 'customer' },
  })

  const createMutation = useMutation({
    mutationFn: (data) => adminAPI.createUser(data),
    onSuccess: () => {
      toast.success('User created successfully.')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      onClose()
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to create user'
      if (msg.toLowerCase().includes('email')) {
        setError('email', { message: msg })
      } else if (msg.toLowerCase().includes('phone')) {
        setError('phone', { message: msg })
      } else {
        toast.error(msg)
      }
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Create User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="input-field"
              placeholder="Full name"
            />
            <p className="text-red-500 text-xs mt-1 h-4">{errors.name?.message || ''}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
              })}
              type="email"
              className="input-field"
              placeholder="you@example.com"
            />
            <p className="text-red-500 text-xs mt-1 h-4">{errors.email?.message || ''}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
              type="password"
              className="input-field"
              placeholder="Min. 8 characters"
            />
            <p className="text-red-500 text-xs mt-1 h-4">{errors.password?.message || ''}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              {...register('phone', {
                pattern: { value: /^[6-9]\d{9}$/, message: 'Valid 10-digit Indian number' },
              })}
              type="tel"
              className="input-field"
              placeholder="10-digit mobile number"
            />
            <p className="text-red-500 text-xs mt-1 h-4">{errors.phone?.message || ''}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select {...register('role')} className="input-field">
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-sm text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white py-2 rounded-sm text-sm font-semibold transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 400)
  const [roleFilter, setRoleFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn: () =>
      adminAPI.getUsers({
        page,
        limit: 15,
        search: search.trim() || undefined,
        role: roleFilter === 'All' ? undefined : roleFilter,
      }).then((r) => r.data),
    keepPreviousData: true,
  })

  const blockMutation = useMutation({
    mutationFn: (id) => adminAPI.blockUser(id),
    onSuccess: (data) => {
      toast.success(data.data.message)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err) => toast.error(err.message || 'Action failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => adminAPI.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setDeleteConfirm(null)
    },
    onError: (err) => toast.error(err.message || 'Failed to delete'),
  })

  const users = data?.users || []
  const total = data?.total || 0
  const totalPages = data?.pagination?.totalPages || 1

  return (
    <>
      <Helmet><title>Users - Admin | Shoppioo</title></Helmet>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Users</h1>
            <p className="text-sm text-gray-500">{total} registered users</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-sm transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            Create User
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(1) }}
              className="input-field pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="input-field sm:w-36"
          >
            <option value="All">All Roles</option>
            <option value="customer">Customers</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Orders</th>
                  <th className="text-left px-4 py-3">Joined</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-gray-50 ${isFetching ? 'opacity-60' : ''} transition-opacity`}>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500">No users found</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {user.avatar?.url ? (
                              <img src={user.avatar.url} alt={user.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span className="text-primary-700 font-semibold text-sm">
                                {user.name?.[0]?.toUpperCase() || 'U'}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.phone || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {user.role || 'customer'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{user.orderCount || 0}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {user.createdAt ? format(new Date(user.createdAt), 'dd MMM yyyy') : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.isActive ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.role !== 'admin' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => blockMutation.mutate(user._id)}
                              disabled={blockMutation.isPending}
                              className={`text-xs font-medium px-3 py-1 rounded transition-colors disabled:opacity-50 ${
                                user.isActive
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                            >
                              {user.isActive ? 'Block' : 'Unblock'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(user)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete user"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={total}
            itemsPerPage={15}
          />
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold text-gray-800 mb-2">Delete User?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Permanently delete <span className="font-medium text-gray-700">{deleteConfirm.name}</span> ({deleteConfirm.email})? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-sm text-sm hover:bg-red-600 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-sm text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
