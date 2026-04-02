import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FiGrid, FiPackage, FiShoppingBag, FiUsers, FiTag,
  FiPercent, FiBarChart2, FiChevronLeft, FiChevronRight,
  FiLogOut, FiBell, FiMenu, FiX, FiExternalLink
} from 'react-icons/fi'
import { useAuth } from '../../hooks/useAuth'

const sidebarLinks = [
  { path: '/admin', label: 'Dashboard', icon: FiGrid, exact: true },
  { path: '/admin/products', label: 'Products', icon: FiPackage },
  { path: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
  { path: '/admin/users', label: 'Users', icon: FiUsers },
  { path: '/admin/categories', label: 'Categories', icon: FiTag },
  { path: '/admin/coupons', label: 'Coupons', icon: FiPercent },
]

export default function AdminLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={`
        ${mobile ? 'w-64' : isCollapsed ? 'w-16' : 'w-64'}
        bg-gray-900 text-white flex flex-col transition-all duration-300
        ${mobile ? '' : 'hidden md:flex'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 bg-gray-800 border-b border-gray-700">
        {(!isCollapsed || mobile) && (
          <Link to="/" className="flex items-center gap-1">
            <span className="font-bold text-lg text-white">
              Shoppi<span className="text-yellow-400">oo</span>
            </span>
            <span className="text-xs text-gray-400 bg-gray-700 px-1 rounded">Admin</span>
          </Link>
        )}
        {!mobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors ml-auto"
          >
            {isCollapsed ? (
              <FiChevronRight className="w-4 h-4" />
            ) : (
              <FiChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
        {mobile && (
          <button onClick={() => setIsMobileOpen(false)} className="p-1.5 rounded hover:bg-gray-700">
            <FiX className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {sidebarLinks.map((link) => {
          const Icon = link.icon
          const active = isActive(link.path, link.exact)
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => mobile && setIsMobileOpen(false)}
              title={isCollapsed && !mobile ? link.label : ''}
              className={`
                flex items-center gap-3 px-4 py-3 mx-2 rounded-lg mb-1 transition-colors
                ${active
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {(!isCollapsed || mobile) && (
                <span className="text-sm font-medium">{link.label}</span>
              )}
              {active && (!isCollapsed || mobile) && (
                <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: View Store + Logout */}
      <div className="border-t border-gray-700 py-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors mb-1 ${isCollapsed && !mobile ? 'justify-center' : ''}`}
        >
          <FiExternalLink className="w-4 h-4 flex-shrink-0" />
          {(!isCollapsed || mobile) && <span className="text-sm">View Store</span>}
        </a>
        <button
          onClick={logout}
          className={`flex items-center gap-3 w-full px-4 py-2 mx-2 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors ${isCollapsed && !mobile ? 'justify-center' : ''}`}
          style={{ width: 'calc(100% - 16px)' }}
        >
          <FiLogOut className="w-4 h-4 flex-shrink-0" />
          {(!isCollapsed || mobile) && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm h-16 flex items-center px-4 sm:px-6 gap-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className="md:hidden p-2 rounded hover:bg-gray-100 transition-colors"
          >
            <FiMenu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Page Title / Breadcrumb */}
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-800">
              {sidebarLinks.find((l) =>
                l.exact ? location.pathname === l.path : location.pathname.startsWith(l.path)
              )?.label || 'Admin'}
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
              <FiBell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-800">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
