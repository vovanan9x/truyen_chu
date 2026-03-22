import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type Level = 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

interface LogOptions {
  path?: string
  method?: string
  userId?: string
  metadata?: Record<string, unknown>
}

export async function logError(level: Level, message: string, opts?: LogOptions) {
  try {
    await prisma.errorLog.create({
      data: {
        level,
        message: message.slice(0, 5000),
        path: opts?.path,
        method: opts?.method,
        userId: opts?.userId,
        metadata: opts?.metadata as Prisma.InputJsonValue ?? undefined,
      }
    })
  } catch {
    // Không để lỗi logger lại gây lỗi
    console.error('[ErrorLogger] Failed to save log:', message)
  }
}

export async function captureException(err: unknown, opts?: LogOptions & { level?: Level }) {
  const error = err instanceof Error ? err : new Error(String(err))
  const level = opts?.level ?? 'ERROR'
  try {
    await prisma.errorLog.create({
      data: {
        level,
        message: error.message.slice(0, 5000),
        stack: error.stack?.slice(0, 10000),
        path: opts?.path,
        method: opts?.method,
        userId: opts?.userId,
        metadata: opts?.metadata as Prisma.InputJsonValue ?? undefined,
      }
    })
  } catch {
    console.error('[ErrorLogger] Failed to capture exception:', error.message)
  }
  console.error(`[${level}]`, error.message)
}
