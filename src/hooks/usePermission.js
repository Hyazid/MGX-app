
// ============================================================
// src/hooks/usePermission.js
// ============================================================
import { useAuthStore } from '../store/authStore'
import { canDo } from '../utils/permissions'

export function usePermission() {
  const user = useAuthStore(s => s.user)

  return {
    can: (permission) => user ? canDo(permission, user.role) : false,
    role: user?.role,
    user
  }

}