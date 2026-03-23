/**
 * PM2 Ecosystem Config — Production VPS
 *
 * Dùng: pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      name: 'truyen-chu',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',

      // ── Instances ───────────────────────────────────────────────────────────
      // QUAN TRỌNG: Dùng 1 instance (fork mode) thay vì cluster.
      // Lý do: built-in scheduler & BullMQ worker chạy trong process —
      // nếu cluster thì nhiều instance sẽ chạy scheduler song song → crawl trùng.
      instances: 1,
      exec_mode: 'fork',

      // ── Memory / Auto-restart ────────────────────────────────────────────────
      // Restart nếu RAM vượt 512MB (tuỳ VPS của bạn)
      max_memory_restart: '512M',

      // ── Logs ────────────────────────────────────────────────────────────────
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ── Watch (tắt trong production) ────────────────────────────────────────
      watch: false,

      // ── Environment ─────────────────────────────────────────────────────────
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
