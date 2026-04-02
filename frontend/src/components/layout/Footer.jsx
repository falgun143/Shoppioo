import { Link } from 'react-router-dom'
import {
  FiFacebook, FiTwitter, FiInstagram, FiYoutube,
  FiMail, FiPhone, FiMapPin
} from 'react-icons/fi'

const footerLinks = {
  about: [
    { label: 'About Shoppioo', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Press', href: '/press' },
    { label: 'Shoppioo Blog', href: '/blog' },
    { label: 'Affiliate Program', href: '/affiliate' },
    { label: 'Advertise With Us', href: '/advertise' },
  ],
  customerService: [
    { label: 'Help Center', href: '/help' },
    { label: 'Track Order', href: '/orders' },
    { label: 'Returns & Refunds', href: '/returns' },
    { label: 'Shipping Policy', href: '/shipping' },
    { label: 'Payment Methods', href: '/payment-methods' },
    { label: 'Contact Us', href: '/contact' },
  ],
  myAccount: [
    { label: 'My Profile', href: '/profile' },
    { label: 'My Orders', href: '/orders' },
    { label: 'My Wishlist', href: '/wishlist' },
    { label: 'My Cart', href: '/cart' },
    { label: 'Saved Addresses', href: '/profile' },
    { label: 'Change Password', href: '/profile' },
  ],
  policies: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Use', href: '/terms' },
    { label: 'Security', href: '/security' },
    { label: 'Sitemap', href: '/sitemap' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Grievance Redressal', href: '/grievance' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* About Column */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
              About
            </h3>
            <ul className="space-y-2">
              {footerLinks.about.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-gray-400 text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service Column */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
              Customer Service
            </h3>
            <ul className="space-y-2">
              {footerLinks.customerService.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-gray-400 text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* My Account Column */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
              My Account
            </h3>
            <ul className="space-y-2">
              {footerLinks.myAccount.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-gray-400 text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Column */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
              Connect With Us
            </h3>
            {/* Social Links */}
            <div className="flex gap-3 mb-6">
              <a
                href="https://facebook.com/shoppioo"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-blue-600 p-2 rounded-full transition-colors"
              >
                <FiFacebook className="w-4 h-4 text-white" />
              </a>
              <a
                href="https://twitter.com/shoppioo"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-sky-500 p-2 rounded-full transition-colors"
              >
                <FiTwitter className="w-4 h-4 text-white" />
              </a>
              <a
                href="https://instagram.com/shoppioo"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-pink-600 p-2 rounded-full transition-colors"
              >
                <FiInstagram className="w-4 h-4 text-white" />
              </a>
              <a
                href="https://youtube.com/shoppioo"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-red-600 p-2 rounded-full transition-colors"
              >
                <FiYoutube className="w-4 h-4 text-white" />
              </a>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <FiPhone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>1800-000-SHOPPIOO</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <FiMail className="w-3.5 h-3.5 flex-shrink-0" />
                <a href="mailto:support@shoppioo.in" className="hover:text-white transition-colors">
                  support@shoppioo.in
                </a>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-400">
                <FiMapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Shoppioo Internet Pvt. Ltd., Bengaluru, Karnataka 560001</span>
              </div>
            </div>

            {/* Policy Links */}
            <div className="mt-4">
              <h4 className="text-gray-500 text-xs uppercase tracking-wide mb-2">Policies</h4>
              <ul className="space-y-1">
                {footerLinks.policies.slice(0, 3).map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="text-gray-400 text-xs hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <Link to="/" className="text-white font-bold text-lg">
                Shoppi<span className="text-yellow-400">oo</span>
              </Link>
              <p className="text-gray-500 text-xs mt-1">
                © {new Date().getFullYear()} Shoppioo Internet Pvt. Ltd. All rights reserved.
              </p>
              <p className="text-gray-600 text-xs">CIN: U74999KA2024PTC12345 | shoppioo.in</p>
            </div>

            {/* Payment Methods */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-gray-500 text-xs uppercase tracking-wide">
                Safe & Secure Payments
              </span>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {[
                  { label: 'Visa', bg: 'bg-blue-600', text: 'text-white' },
                  { label: 'MasterCard', bg: 'bg-red-600', text: 'text-white' },
                  { label: 'UPI', bg: 'bg-green-600', text: 'text-white' },
                  { label: 'RuPay', bg: 'bg-orange-500', text: 'text-white' },
                  { label: 'Razorpay', bg: 'bg-primary-500', text: 'text-white' },
                  { label: 'NetBanking', bg: 'bg-gray-600', text: 'text-white' },
                ].map((pm) => (
                  <span
                    key={pm.label}
                    className={`${pm.bg} ${pm.text} text-xs font-bold px-2 py-1 rounded text-center`}
                  >
                    {pm.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
