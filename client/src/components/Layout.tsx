import { NavLink, useNavigate } from 'react-router-dom'
import { ShoppingBag, Users, Package, BarChart2, LogOut } from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'

const navItems = [
  { to: '/sell',      icon: ShoppingBag, label: 'Sell',      managerOnly: false },
  { to: '/customers', icon: Users,       label: 'Customers', managerOnly: false },
  { to: '/inventory', icon: Package,     label: 'Inventory', managerOnly: true  },
  { to: '/dashboard', icon: BarChart2,   label: 'Dashboard', managerOnly: true  },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { staff, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const visibleNav = navItems.filter((n) => !n.managerOnly || staff?.role === 'manager')

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-4 border-r border-gray-200 bg-white flex-shrink-0">
        {/* Logo */}
        <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center text-white text-xs font-bold mb-6">
          WV
        </div>

        {/* Nav */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                `w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon size={18} />
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Log out"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </aside>

      {/* Page content */}
      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
    </div>
  )
}
