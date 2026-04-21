
// ============================================================
// src/layouts/AppLayout.jsx
// ============================================================
import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { usePermission } from '@/hooks/usePermission'
import { getRoleLabel } from '@/utils/permissions'
import {
  LayoutDashboard, FileText, ShoppingCart, Truck, ClipboardCheck,
  Package, ClipboardList, Users, BarChart2, ChevronLeft, ChevronRight,
  LogOut, Bell, Menu, X, ChevronDown, Boxes
} from 'lucide-react'

const NAV = [
  { label: 'Tableau de bord',    icon: LayoutDashboard, to: '/dashboard',    perm: null },
  { label: 'Demandes d\'achat',  icon: FileText,        to: '/bda',          perm: 'bda:view' },
  { label: 'Bons de commande',   icon: ShoppingCart,    to: '/bc',           perm: 'bc:view' },
  { label: 'Réceptions',         icon: Truck,           to: '/receptions',   perm: 'br:view' },
  { label: 'Décharges',          icon: ClipboardCheck,  to: '/decharges',    perm: 'decharge:view' },
  { label: 'Stock',              icon: Package,         to: '/stock',        perm: 'stock:view' },
  { label: 'Inventaire',         icon: ClipboardList,   to: '/inventaire',   perm: 'inventaire:create' },
  { label: 'Articles',           icon: Boxes,           to: '/articles',     perm: 'articles:view' },
  { label: 'Fournisseurs',       icon: Users,           to: '/fournisseurs', perm: 'fournisseurs:manage' },
  { label: 'Rapports',           icon: BarChart2,       to: '/rapports/stock', perm: 'rapports:view'  },
  { label: 'Utilisateurs',      icon: Users,           to: '/admin/users',    perm: 'users:manage'   },
]

export default function AppLayout() {
  const navigate          = useNavigate()
  const { can, user }     = usePermission()
  const logout            = useAuthStore(s => s.logout)
  const [collapsed, setCollapsed]     = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [userMenu, setUserMenu]       = useState(false)

  const visible = NAV.filter(i => i.perm === null || can(i.perm))

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={[
        'fixed lg:relative z-30 h-full bg-blue-900 text-white flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ].join(' ')}>

        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-blue-800 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-blue-700" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm leading-tight">Moyens Généraux</p>
              <p className="text-blue-300 text-xs">Gestion commandes</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visible.map(item => (
            <NavLink key={item.to} to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-blue-600 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white',
                collapsed ? 'justify-center' : ''
              ].join(' ')}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(v => !v)}
          className="hidden lg:flex items-center justify-center p-3 border-t border-blue-800 text-blue-300 hover:text-white hover:bg-blue-800 transition">
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button className="lg:hidden text-gray-500" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex-1" />

          {/* Notif */}
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 relative">
            <Bell className="w-5 h-5" />
          </button>

          {/* User */}
          <div className="relative">
            <button onClick={() => setUserMenu(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800 leading-tight">{user?.prenom} {user?.nom}</p>
                <p className="text-xs text-gray-500">{getRoleLabel(user?.role)}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {userMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Connecté en tant que</p>
                    <p className="text-sm font-semibold text-gray-800">{getRoleLabel(user?.role)}</p>
                  </div>
                  <button onClick={() => { logout(); navigate('/login') }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4" /> Se déconnecter
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}