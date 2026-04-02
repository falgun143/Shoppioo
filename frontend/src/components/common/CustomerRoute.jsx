import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

/**
 * Allows unauthenticated users and customers.
 * Redirects admins to /admin so they can't browse the store.
 */
export default function CustomerRoute() {
  const { user } = useAuthStore()

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
