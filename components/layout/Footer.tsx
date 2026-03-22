import Link from 'next/link'
import { BookOpen, Heart, Github } from 'lucide-react'

const FOOTER_LINKS = [
  {
    title: 'Truyện',
    links: [
      { label: 'Danh sách', href: '/truyen' },
      { label: 'Mới cập nhật', href: '/truyen?sort=newest' },
      { label: 'Hoàn thành', href: '/truyen?status=COMPLETED' },
      { label: 'Đề xuất', href: '/truyen?sort=views' },
    ],
  },
  {
    title: 'Thể loại',
    links: [
      { label: 'Tiên hiệp', href: '/the-loai/tien-hiep' },
      { label: 'Ngôn tình', href: '/the-loai/ngon-tinh' },
      { label: 'Huyền huyễn', href: '/the-loai/huyen-huyen' },
      { label: 'Dị giới', href: '/the-loai/di-gioi' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Về chúng tôi', href: '/gioi-thieu' },
      { label: 'Điều khoản', href: '/dieu-khoan' },
      { label: 'Chính sách', href: '/chinh-sach' },
      { label: 'Liên hệ', href: '/lien-he' },
    ],
  },
]

export default function Footer({ siteName = 'TruyenChu' }: { siteName?: string }) {
  return (
    <footer className="border-t bg-muted/30 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gradient">{siteName}</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Web đọc truyện chữ tổng hợp và dịch truyện từ nguồn nước ngoài. Cập nhật nhanh, miễn phí.
            </p>
          </div>

          {/* Links */}
          {FOOTER_LINKS.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-sm mb-4 text-foreground/80 uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {siteName}. Tất cả quyền được bảo lưu.</p>
          <p className="flex items-center gap-1.5">
            Làm với <Heart className="w-4 h-4 text-red-500 fill-current" /> cho độc giả Việt Nam
          </p>
        </div>
      </div>
    </footer>
  )
}
