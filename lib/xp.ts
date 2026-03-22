/**
 * XP Service — cộng XP và tự động upgrade level.
 * Dùng batch update để tránh quá nhiều write.
 */
import { prisma } from './prisma'

// XP thresholds per level
const LEVEL_XP = [0, 100, 500, 1500, 5000, 15000, 50000] // index = level - 1

export function getLevelFromXP(xp: number): number {
  let level = 1
  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (xp >= LEVEL_XP[i]) level = i + 1
    else break
  }
  return level
}

export const XP_REWARDS = {
  READ_CHAPTER:   1,
  COMMENT:        3,
  UNLOCK_CHAPTER: 5,
  DAILY_LOGIN:    2,
  DONATE:         2, // per coin donated
}

export const AUTHOR_LEVEL_THRESHOLDS = [0, 50, 200, 1000, 5000]
export const AUTHOR_LEVEL_NAMES = ['Tác giả mới', 'Tác giả triển vọng', 'Tác giả nổi bật', 'Tác giả uy tín', 'Tác giả hàng đầu']
export const USER_LEVEL_NAMES = ['Độc giả mới', 'Độc giả thường', 'Mọt sách', 'Tín đồ truyện', 'Cao thủ đọc truyện', 'Truyền nhân', 'Huyền thoại']

/**
 * Cộng XP cho user và auto-upgrade level nếu đủ.
 * Chỉ 1 DB call — dùng raw increment.
 */
export async function addXP(userId: string, amount: number): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE users
      SET xp = xp + ${amount},
          level = CASE
            WHEN xp + ${amount} >= 50000 THEN 7
            WHEN xp + ${amount} >= 15000 THEN 6
            WHEN xp + ${amount} >= 5000  THEN 5
            WHEN xp + ${amount} >= 1500  THEN 4
            WHEN xp + ${amount} >= 500   THEN 3
            WHEN xp + ${amount} >= 100   THEN 2
            ELSE 1
          END
      WHERE id = ${userId}
    `
  } catch {
    // Non-critical, don't break main flow
  }
}

/**
 * Tính level tác giả dựa theo follower count.
 */
export function getAuthorLevel(followerCount: number): number {
  let level = 1
  for (let i = 0; i < AUTHOR_LEVEL_THRESHOLDS.length; i++) {
    if (followerCount >= AUTHOR_LEVEL_THRESHOLDS[i]) level = i + 1
    else break
  }
  return level
}
