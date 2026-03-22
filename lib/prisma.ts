import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Connection pool: giới hạn 20 connections, timeout 10s
// Tránh PostgreSQL bị "too many clients" khi 5000+ CCU
function buildDatasourceUrl() {
  const base = process.env.DATABASE_URL ?? ''
  if (!base) return base
  try {
    const url = new URL(base)
    url.searchParams.set('connection_limit', '20')
    url.searchParams.set('pool_timeout', '10')
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
