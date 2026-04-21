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