/**
 * lib/permissions.ts
 * Helper tập trung kiểm tra quyền ADMIN / MOD trong API routes.
 * Usage:
 *   import { getSessionRole, isAdminRole, isAdminOrMod } from '@/lib/permissions'
 *   const role = await getSessionRole()
 *   if (!isAdminOrMod(role)) return 403
 */
import { auth } from '@/lib/auth'

export type AppRole = 'READER' | 'AUTHOR' | 'TRANSLATOR' | 'MOD' | 'ADMIN'

/** Lấy role từ session hiện tại */
export async function getSessionRole(): Promise<AppRole | null> {
  const session = await auth()
  return (session?.user?.role as AppRole) ?? null
}

/** Lấy userId từ session */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/** Chỉ ADMIN */
export function isAdminRole(role: AppRole | null): role is 'ADMIN' {
  return role === 'ADMIN'
}

/** ADMIN hoặc MOD */
export function isAdminOrMod(role: AppRole | null): boolean {
  return role === 'ADMIN' || role === 'MOD'
}

/** Helper dùng trong route handler — trả về role + userId cùng lúc */
export async function getAdminSession() {
  const session = await auth()
  const role = session?.user?.role as AppRole | undefined
  const userId = session?.user?.id as string | undefined
  return { role, userId, isAdmin: role === 'ADMIN', isMod: role === 'MOD', isAdminOrMod: role === 'ADMIN' || role === 'MOD' }
}

/**
 * Các section admin chỉ ADMIN mới thấy
 * Dùng trong sidebar để ẩn với MOD
 */
export const ADMIN_ONLY_SECTIONS = [
  'cai-dat',
  'giao-dich',
  'rut-xu',
  'nap-xu',
  'loi-he-thong',
  'nang-cap-tai-khoan',
  'mod-requests', // trang duyệt request từ MOD — chỉ ADMIN
] as const
