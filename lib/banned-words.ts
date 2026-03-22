/**
 * Banned words service — cache vào memory, reload khi DB thay đổi.
 * Tránh query DB mỗi lần tạo comment.
 */
import { prisma } from './prisma'

let cachedWords: Set<string> = new Set()
let lastLoaded = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 phút

export async function getBannedWords(): Promise<Set<string>> {
  const now = Date.now()
  if (now - lastLoaded > CACHE_TTL || cachedWords.size === 0) {
    const words = await prisma.bannedWord.findMany({
      where: { isActive: true },
      select: { word: true },
    })
    cachedWords = new Set(words.map(w => w.word.toLowerCase()))
    lastLoaded = now
  }
  return cachedWords
}

export function invalidateBannedWordsCache() {
  lastLoaded = 0
}

/**
 * Lọc nội dung: thay từ cấm bằng ***
 * Trả về { filtered: string; found: string[] }
 */
export async function filterContent(text: string): Promise<{ filtered: string; blocked: string[] }> {
  const words = await getBannedWords()
  if (words.size === 0) return { filtered: text, blocked: [] }

  let filtered = text
  const blocked: string[] = []

  for (const word of Array.from(words)) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi')
    if (regex.test(filtered)) {
      blocked.push(word)
      // Track hit count async (fire-and-forget)
      prisma.bannedWord.updateMany({
        where: { word: { equals: word, mode: 'insensitive' }, isActive: true },
        data: { hitCount: { increment: 1 } },
      }).catch(() => {})

      filtered = filtered.replace(regex, '*'.repeat(word.length))
    }
  }

  return { filtered, blocked }
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
