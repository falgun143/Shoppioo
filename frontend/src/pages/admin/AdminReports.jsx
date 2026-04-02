import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { FiDownload, FiCalendar, FiTrendingUp, FiShoppingBag, FiDollarSign } from 'react-icons/fi'
import { adminAPI } from '../../services/api'
import { formatPrice } from '../../components/common/PriceDisplay'
import { format, subDays } from 'date-fns'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const DATE_PRESETS = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 3 Months', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'Last Year', days: 365 },
]

function formatChartData(revenueData, groupBy) {
  if (!revenueData?.length) return []
  return revenueData.map((d) => {
    let date
    if (groupBy === 'month') {
      date = `${MONTH_NAMES[(d._id.month || 1) - 1]} ${d._id.year}`
    } else {
      date = format(new Date(d._id.year, (d._id.month || 1) - 1, d._id.day || 1), 'dd MMM')
    }
    return { date, revenue: Math.round(d.revenue), orders: d.orders }
  })
}

export default function AdminReports() {
  const [preset, setPreset] = useState(30)
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))

  const daysDiff = Math.round((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24))
  const groupBy = daysDiff > 60 ? 'month' : 'day'

  const handlePreset = (days) => {
    setPreset(days)
    setDateFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'))
    setDateTo(format(new Date(), 'yyyy-MM-dd'))
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', dateFrom, dateTo],
    queryFn: () =>
      adminAPI.getSalesReport({ startDate: dateFrom, endDate: dateTo, groupBy }).then((r) => r.data),
  })

  const report = data?.report
  const chartData = formatChartData(report?.revenueData, groupBy)
  const summary = report?.summary || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 }
  const topProducts = (report?.topProducts || []).map((p) => ({
    name: p.name,
    revenue: p.totalRevenue,
    units: p.totalSold,
  }))

  const handleExport = () => {
    const csv = [
      ['Date', 'Revenue', 'Orders'],
      ...chartData.map((d) => [d.date, d.revenue, d.orders]),
    ].map((r) => r.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shoppioo-report-${dateFrom}-to-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Helmet><title>Reports - Admin | Shoppioo</title></Helmet>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Sales Reports</h1>
            <p className="text-sm text-gray-500">Analyze your business performance</p>
          </div>
          <button
            onClick={handleExport}
            disabled={chartData.length === 0}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 rounded-sm text-sm transition-colors disabled:opacity-40"
          >
            <FiDownload className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Date Filters */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => handlePreset(p.days)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  preset === p.days
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Custom:</span>
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPreset(null) }}
              className="input-field w-36"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPreset(null) }}
              className="input-field w-36"
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: FiDollarSign, label: 'Total Revenue', value: formatPrice(summary.totalRevenue), color: 'bg-green-500' },
            { icon: FiShoppingBag, label: 'Total Orders', value: summary.totalOrders.toLocaleString(), color: 'bg-primary-500' },
            { icon: FiTrendingUp, label: 'Avg Order Value', value: formatPrice(summary.avgOrderValue), color: 'bg-purple-500' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-sm border border-gray-100 shadow-sm p-4">
                <div className={`w-9 h-9 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-xl font-bold text-gray-900">{isLoading ? '...' : stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4">Revenue & Orders Trend</h2>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Loading...</div>
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'revenue' ? formatPrice(value) : value,
                    name === 'revenue' ? 'Revenue' : 'Orders'
                  ]}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#2874f0" strokeWidth={2} dot={false} name="revenue" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#ff6161" strokeWidth={2} dot={false} name="orders" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products + Bar Chart */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Revenue Bar Chart */}
          <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-4">
              {groupBy === 'month' ? 'Monthly Revenue' : 'Daily Revenue'}
            </h2>
            {chartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={groupBy === 'month' ? chartData : chartData.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => formatPrice(value)} />
                  <Bar dataKey="revenue" fill="#2874f0" radius={[3, 3, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Products Table */}
          <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-4">Top Products</h2>
            {topProducts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">No sales data for this period</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, idx) => {
                  const maxRevenue = topProducts[0]?.revenue || 1
                  const barWidth = (product.revenue / maxRevenue) * 100
                  return (
                    <div key={product.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-gray-100 rounded text-xs flex items-center justify-center font-semibold text-gray-500">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-gray-800 line-clamp-1 max-w-[160px]">{product.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 text-xs">{formatPrice(product.revenue)}</p>
                          <p className="text-gray-400 text-xs">{product.units} units</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
