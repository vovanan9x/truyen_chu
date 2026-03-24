import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Connection pool: giới hạn 30 connections, timeout 15s
// Đủ cho 8 truyện × 3 chapters song song (24 connections) + headroom cho API khác
function buildDatasourceUrl() {
  const base = process.env.DATABASE_URL ?? ''
  if (!base) return base
  try {
    const url = new URL(base)
    url.searchParams.set('connection_limit', '30')
    url.searchParams.set('pool_timeout', '15')
    return url.toString()
  } catch {
    return base
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: buildDatasourceUrl(),
  })

// Cache trong cả production để hot-reload không tạo instance mới
globalForPrisma.prisma = prisma
