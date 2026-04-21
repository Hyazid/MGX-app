// ============================================================
// src/store/authStore.js
// ============================================================
import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,

  login: async (username, password) => {
    const res = await window.api.invoke('users:login', { username, password })
    if (res.ok) {
      set({ user: res.user, isAuthenticated: true })
    }
    return res  // { ok, error? }
  },

  logout: () => set({ user: null, isAuthenticated: false }),

  hasRole: (...roles) => {
    const u = get().user
    return u ? roles.includes(u.role) : false
  }
}))


// ============================================================
// src/utils/permissions.js
// ============================================================
// Définit ce que chaque rôle peut faire
// Utilisation : canDo('bc:create', user.role)

const PERMISSIONS = {
  chef_moyens_generaux: [
    'bda:validate', 'bda:reject','bda:create', 'bda:edit', 'bda:view',
    'bc:create', 'bc:edit', 'bc:view',
    'br:view',
    'decharge:create', 'decharge:view',
    'stock:view', 'stock:adjust',
    'inventaire:validate',
    'fournisseurs:manage',
    'rapports:view',
    'users:manage'
  ],
  agent_administratif: [
    'bda:create', 'bda:edit', 'bda:view',
    'bc:view',
    'decharge:view',
    'stock:view'
  ],
  magasinier: [
    'bda:view',
    'bc:view',
    'br:create', 'br:view',
    'stock:view', 'stock:move',
    'inventaire:create', 'inventaire:saisie'
  ],
  comptable: [
    'bda:view',
    'bc:view',
    'br:view',
    'decharge:view',
    'stock:view',
    'rapports:view'
  ]
}

export function canDo(permission, role) {
  return PERMISSIONS[role]?.includes(permission) ?? false
}

export function getRoleLabel(role) {
  const labels = {
    chef_moyens_generaux: 'Chef Moyens Généraux',
    agent_administratif:  'Agent Administratif',
    magasinier:           'Magasinier',
    comptable:            'Comptable'
  }
  return labels[role] ?? role
}


