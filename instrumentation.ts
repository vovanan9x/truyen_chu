/**
 * Next.js Instrumentation Hook
 * Chạy 1 lần khi server khởi động — dùng để start built-in scheduler
 * Ref: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Chỉ chạy ở Node.js runtime (server), không chạy ở Edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler')
    startScheduler()
  }
}
