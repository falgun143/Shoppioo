import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  FiDollarSign, FiShoppingBag, FiUsers, FiPackage,
  FiTrendingUp, FiArrowUpRight, FiArrowDownRight, FiEye
} from 'react-icons/fi'
import { adminAPI } from '../../services/api'
import { SectionLoader } from '../../components/common/Loader'
import { formatPrice } from '../../components/common/PriceDisplay'
import { format } from 'date-fns'

const COLORS = ['#22c55e', '#2874f0', '#8b5cf6', '#f59e0b', '#ef4444', '#94a3b8']
const STATUS_COLORS = {
  delivered: '#22c55e',
  processing: '#2874f0',
  shipped: '#8b5cf6',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  returned: '#94a3b8',
}
const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

function StatCard({ icon: Icon, title, value, growth, color, link }) {
  const isPositive = growth > 0
  return (
    <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {link && (
          <Link to={link} className="text-gray-400 hover:text-primary-500 transition-colors">
            <FiEye className="w-4 h-4" />
          </Link>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{title}</p>
      {growth !== undefined && growth !== null && (
        <div className={`flex items-center gap-1 text-xs mt-2 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? <FiArrowUpRight className="w-3.5 h-3.5" /> : <FiArrowDownRight className="w-3.5 h-3.5" />}
          <span className="font-medium">{Math.abs(growth)}%</span>
          <span className="text-gray-400">vs last month</span>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminAPI.getDashboard().then((r) => r.data),
  })

  if (isLoading) return <SectionLoader text="Loading dashboard..." />

  const stats = data?.stats || {}
  const revenueChart = stats.revenueByMonth || []

  // Convert ordersByStatus object { delivered: 45, processing: 20 } → pie array
  const rawStatus = stats.ordersByStatus || {}
  const totalStatusCount = Object.values(rawStatus).reduce((s, v) => s + v, 0)
  const statusPie = Object.entries(rawStatus).map(([name, count], idx) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: count,
    pct: totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0,
    color: STATUS_COLORS[name] || COLORS[idx % COLORS.length],
  }))

  const recentOrders = stats.recentOrders || []
  const topProducts = stats.topProducts || []

  return (
    <>
      <Helmet><title>Admin Dashboard - Shoppioo</title></Helmet>

      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FiDollarSign}
            title="Total Revenue"
            value={formatPrice(stats.totalRevenue || 0)}
            growth={stats.thisMonth?.revenueGrowth}
            color="bg-green-500"
            link="/admin/reports"
          />
          <StatCard
            icon={FiShoppingBag}
            title="Total Orders"
            value={stats.totalOrders?.toLocaleString()}
            growth={stats.thisMonth?.orderGrowth}
            color="bg-primary-500"
            link="/admin/orders"
          />
          <StatCard
            icon={FiUsers}
            title="Total Users"
            value={stats.totalUsers?.toLocaleString()}
            color="bg-purple-500"
            link="/admin/users"
          />
          <StatCard
            icon={FiPackage}
            title="Products"
            value={stats.totalProducts?.toLocaleString()}
            color="bg-orange-500"
            link="/admin/products"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Revenue Line Chart */}
          <div className="xl:col-span-2 bg-white rounded-sm border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Revenue Overview (12 Months)</h2>
              <FiTrendingUp className="text-green-500 w-5 h-5" />
            </div>
            {revenueChart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">No revenue data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'revenue' ? formatPrice(value) : value,
                      name === 'revenue' ? 'Revenue' : 'Orders'
                    ]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#2874f0" strokeWidth={2} dot={{ r: 4 }} name="revenue" />
                  <Line type="monotone" dataKey="orders" stroke="#ff6161" strokeWidth={2} dot={{ r: 4 }} name="orders" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Orders by Status Pie */}
          <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-4">Orders by Status</h2>
            {statusPie.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">No orders yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value + ' orders', name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {statusPie.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                        <span className="text-gray-600">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{entry.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Recent Orders */}
          <div className="bg-white rounded-sm border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Recent Orders</h2>
              <Link to="/admin/orders" className="text-primary-500 text-xs font-semibold hover:underline">
                View All →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-50">
                      <th className="text-left px-5 py-2.5">Order #</th>
                      <th className="text-left px-5 py-2.5">Customer</th>
                      <th className="text-left px-5 py-2.5">Amount</th>
                      <th className="text-left px-5 py-2.5">Status</th>
                      <th className="text-left px-5 py-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <Link to={`/orders/${order._id}`} className="text-primary-500 font-medium hover:underline">
                            #{order.orderNumber || order._id.slice(-6).toUpperCase()}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-gray-700">{order.user?.name || 'User'}</td>
                        <td className="px-5 py-3 font-semibold text-gray-900">{formatPrice(order.totalPrice)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_STYLES[order.orderStatus] || 'bg-gray-100 text-gray-800'}`}>
                            {order.orderStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {order.createdAt ? format(new Date(order.createdAt), 'dd MMM') : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-sm border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Top Selling Products</h2>
              <Link to="/admin/products" className="text-primary-500 text-xs font-semibold hover:underline">
                View All →
              </Link>
            </div>
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No sales data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-50">
                      <th className="text-left px-5 py-2.5">Product</th>
                      <th className="text-left px-5 py-2.5">Sales</th>
                      <th className="text-left px-5 py-2.5">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topProducts.map((product, idx) => (
                      <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-gray-100 rounded text-xs flex items-center justify-center font-semibold text-gray-500">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-gray-800 line-clamp-1 max-w-[140px]">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-700">{product.totalSold} units</td>
                        <td className="px-5 py-3 font-semibold text-gray-900 text-xs">{formatPrice(product.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
