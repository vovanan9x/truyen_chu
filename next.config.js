/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,

  experimental: {
    instrumentationHook: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },


  // ─── Image whitelist (không dùng ** để tránh lạm dụng proxy) ─────────────
  images: {
    remotePatterns: [
      // Google / GitHub avatar
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      // Truyện crawl — thêm domain ở đây nếu gặp lỗi hostname mới
      { protocol: 'https', hostname: 'img.xtruyen.vn' },
      { protocol: 'https', hostname: 'static.truyenfull.vision' },
      { protocol: 'https', hostname: '**.truyenfull.vision' },
      { protocol: 'https', hostname: '**.truyentranh3.net' },
      { protocol: 'https', hostname: '**.truyenqq.com.vn' },
      { protocol: 'https', hostname: '**.mangapark.net' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      // Fallback cho các domain chưa biết — chỉ https
      { protocol: 'https', hostname: '**' },
    ],
  },

  // ─── HTTP Security Headers ────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      // Cache static assets
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|css|js)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}

module.exports = nextConfig
