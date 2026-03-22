import { Metadata } from 'next'
import {
  Server, Database, Shield, Terminal, CheckCircle2,
  AlertTriangle, RefreshCw, Globe, GitBranch, Upload, Rocket
} from 'lucide-react'

export const metadata: Metadata = { title: 'Hướng dẫn Deploy — Admin' }

function Step({ n, title, icon: Icon, children }: {
  n: number; title: string; icon?: React.FC<any>; children: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-primary text-white flex items-center justify-center text-sm font-bold shadow-sm mt-0.5">
        {n}
      </div>
      <div className="flex-1 pb-8 border-b border-border/60 last:border-0 last:pb-0">
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}

function Code({ children, lang = 'bash' }: { children: string; lang?: string }) {
  return (
    <pre className="bg-zinc-950 text-zinc-100 rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed my-3 whitespace-pre-wrap">
      <code>{children}</code>
    </pre>
  )
}

function Inline({ children }: { children: string }) {
  return <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-primary">{children}</code>
}

function Alert({ type, children }: { type: 'warn' | 'info' | 'success' | 'danger'; children: React.ReactNode }) {
  const cfg = {
    warn:    { cls: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',  Icon: AlertTriangle },
    info:    { cls: 'bg-blue-500/10   border-blue-500/30   text-blue-700   dark:text-blue-400', Icon: Globe },
    success: { cls: 'bg-green-500/10  border-green-500/30  text-green-700  dark:text-green-400', Icon: CheckCircle2 },
    danger:  { cls: 'bg-red-500/10    border-red-500/30    text-red-700    dark:text-red-400',  Icon: AlertTriangle },
  }
  const { cls, Icon } = cfg[type]
  return (
    <div className={`flex gap-2.5 p-3.5 rounded-xl border text-sm my-3 ${cls}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: React.FC<any>; title: string }) {
  return (
    <h2 className="font-bold text-lg flex items-center gap-2 mb-5">
      <Icon className="w-5 h-5 text-primary" />
      {title}
    </h2>
  )
}

export default function DeployGuidePage() {
  return (
    <div className="max-w-3xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5">
          <Rocket className="w-6 h-6 text-primary" /> Hướng dẫn Deploy lên VPS (via Git)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quy trình đầy đủ: Push code lên GitHub → Clone trên VPS → Build → Chạy với PM2 + Nginx + SSL
        </p>
      </div>

      <Alert type="warn">
        <strong>Bắt buộc dùng VPS</strong> — App có built-in scheduler và SSE connections,
        không thể deploy lên Vercel/serverless. Yêu cầu: <strong>Ubuntu 22.04 · RAM ≥ 2GB · Domain trỏ về IP VPS</strong>.
      </Alert>

      {/* === PHASE 1: Local Setup === */}
      <div className="p-5 rounded-2xl border border-border bg-card">
        <SectionTitle icon={GitBranch} title="Giai đoạn 1 — Chuẩn bị trên máy local (Windows)" />
        <div className="space-y-0">

          <Step n={1} title="Khởi tạo Git repo và commit lần đầu" icon={GitBranch}>
            <p className="text-sm text-muted-foreground mb-2">
              Mở PowerShell trong thư mục <Inline>d:\truyen_chu</Inline>:
            </p>
            <Code>{`cd d:\\truyen_chu

git init
git add .
git commit -m "feat: initial commit"

# Tạo file .gitignore nếu chưa có
echo "node_modules/
.next/
.env
.env.local
public/uploads/" > .gitignore`}</Code>
            <Alert type="warn">
              File <Inline>.env</Inline> phải nằm trong <Inline>.gitignore</Inline> — không bao giờ push biến môi trường lên GitHub!
            </Alert>
          </Step>

          <Step n={2} title="Tạo repo trên GitHub và push code" icon={Upload}>
            <p className="text-sm text-muted-foreground mb-2">
              Vào <strong>github.com → New repository</strong> → đặt tên <Inline>truyen-chu</Inline> → Create (chọn Private).
            </p>
            <Code>{`# Thêm remote origin (thay YOUR_USERNAME):
git remote add origin https://github.com/YOUR_USERNAME/truyen-chu.git
git branch -M main
git push -u origin main`}</Code>
            <p className="text-sm text-muted-foreground mt-2">
              Mỗi lần có code mới, chạy lệnh này để cập nhật GitHub:
            </p>
            <Code>{`git add .
git commit -m "fix: mô tả thay đổi"
git push`}</Code>
          </Step>

        </div>
      </div>

      {/* === PHASE 2: VPS Setup === */}
      <div className="p-5 rounded-2xl border border-border bg-card">
        <SectionTitle icon={Server} title="Giai đoạn 2 — Cài đặt VPS (chỉ làm 1 lần)" />
        <div className="space-y-0">

          <Step n={3} title="Cài môi trường trên VPS">
            <Code>{`# Kết nối SSH vào VPS
ssh root@IP_VPS

# Cài Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Cài PM2, PostgreSQL, Redis, Nginx, Certbot
npm install -g pm2
sudo apt install -y postgresql postgresql-contrib redis-server nginx certbot python3-certbot-nginx

sudo systemctl enable redis-server nginx
sudo systemctl start redis-server nginx`}</Code>
          </Step>

          <Step n={4} title="Cấu hình PostgreSQL" icon={Database}>
            <Code>{`sudo -u postgres psql

-- Trong psql:
CREATE DATABASE truyen_chu;
CREATE USER truyen_user WITH PASSWORD 'MAT_KHAU_MANH_O_DAY';
GRANT ALL PRIVILEGES ON DATABASE truyen_chu TO truyen_user;
ALTER DATABASE truyen_chu OWNER TO truyen_user;
\\q`}</Code>
          </Step>

          <Step n={5} title="Clone repo từ GitHub về VPS" icon={GitBranch}>
            <Code>{`mkdir -p /var/www
cd /var/www

# Clone repo (thay YOUR_USERNAME):
git clone https://github.com/YOUR_USERNAME/truyen-chu.git truyen_chu
cd truyen_chu`}</Code>
            <Alert type="info">
              Nếu repo là <strong>Private</strong>: Tạo GitHub Personal Access Token tại
              GitHub → Settings → Developer settings → Tokens → Generate new token (classic),
              chọn scope <Inline>repo</Inline>. Dùng token thay password khi Git hỏi.
            </Alert>
          </Step>

          <Step n={6} title="Tạo file .env trên VPS" icon={Shield}>
            <Code>{`nano /var/www/truyen_chu/.env`}</Code>
            <Code>{`DATABASE_URL="postgresql://truyen_user:MAT_KHAU_MANH@localhost:5432/truyen_chu"

# Tạo secret: openssl rand -base64 32
NEXTAUTH_SECRET="RANDOM_STRING_32_CHARS"
NEXTAUTH_URL="https://domain-cua-ban.com"
NEXT_PUBLIC_SITE_URL="https://domain-cua-ban.com"

REDIS_URL="redis://localhost:6379"
ADMIN_EMAILS="email_admin_cua_ban@gmail.com"

# Google OAuth (nếu dùng)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""`}</Code>
            <Alert type="danger">
              File <Inline>.env</Inline> này <strong>chỉ tạo trên VPS</strong> — không push lên GitHub.
              Cần backup file này ở nơi an toàn riêng.
            </Alert>
          </Step>

          <Step n={7} title="Build lần đầu và migrate database">
            <Code>{`cd /var/www/truyen_chu
npm install
npx prisma migrate deploy    # migrate deploy, KHÔNG dùng migrate dev
npx prisma db seed           # seed data ban đầu (nếu cần)
npm run build`}</Code>
          </Step>

          <Step n={8} title="Tạo PM2 config và chạy app">
            <Code>{`cat > /var/www/truyen_chu/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'truyen-chu',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/truyen_chu',
    instances: 1,           // BẮT BUỘC = 1 (scheduler dùng setInterval)
    exec_mode: 'fork',      // KHÔNG dùng cluster!
    env: { NODE_ENV: 'production', PORT: 3000 },
    max_memory_restart: '1G',
    restart_delay: 3000,
  }]
}
EOF

pm2 start ecosystem.config.js
pm2 save        # lưu để tự khởi động khi reboot
pm2 startup     # tạo system service`}</Code>
            <Alert type="warn">
              <strong>instances: 1 + exec_mode: fork</strong> là bắt buộc. Nếu dùng cluster,
              scheduler sẽ chạy song song trên nhiều worker → crawl trùng lặp dữ liệu.
            </Alert>
          </Step>

          <Step n={9} title="Cấu hình Nginx và SSL">
            <Code>{`# Tạo Nginx config
cat > /etc/nginx/sites-available/truyen-chu << 'EOF'
server {
    listen 80;
    server_name domain-cua-ban.com www.domain-cua-ban.com;

    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;   # Bắt buộc — SSE không được buffer
        proxy_cache off;
    }

    location /uploads/ {
        alias /var/www/truyen_chu/public/uploads/;
        expires 30d;
    }
}
EOF

ln -s /etc/nginx/sites-available/truyen-chu /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Cài SSL miễn phí (Certbot)
certbot --nginx -d domain-cua-ban.com -d www.domain-cua-ban.com
# → Chọn option 2: Redirect HTTP → HTTPS`}</Code>
            <Alert type="success">
              SSL sẽ tự gia hạn. Kiểm tra: <Inline>certbot renew --dry-run</Inline>
            </Alert>
          </Step>

        </div>
      </div>

      {/* === PHASE 3: Update workflow === */}
      <div className="p-5 rounded-2xl border border-border bg-card">
        <SectionTitle icon={RefreshCw} title="Giai đoạn 3 — Deploy lại khi có code mới" />
        <p className="text-sm text-muted-foreground mb-3">Sau khi setup xong, mỗi lần cập nhật chỉ cần:</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">1. Máy local — Push code mới</p>
            <Code>{`cd d:\\truyen_chu
git add .
git commit -m "fix: mô tả thay đổi"
git push`}</Code>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">2. VPS — Pull và build lại</p>
            <Code>{`cd /var/www/truyen_chu
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart truyen-chu`}</Code>
          </div>
        </div>

        <Alert type="info">
          <strong>Tự động hóa:</strong> Có thể dùng GitHub Actions để tự động SSH vào VPS và chạy
          lệnh deploy sau khi push code lên nhánh <Inline>main</Inline>.
          Hỏi nếu cần hướng dẫn setup CI/CD.
        </Alert>
      </div>

      {/* Notes + Specs */}
      <div className="grid md:grid-cols-2 gap-4">

        <div className="p-5 rounded-2xl border border-border bg-card">
          <h2 className="font-bold mb-4 text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Lưu ý quan trọng</h2>
          <div className="space-y-2">
            {[
              { t: '.env không được push lên Git', d: 'Luôn tạo .env riêng trên VPS' },
              { t: 'instances: 1, exec_mode: fork', d: 'Tránh scheduler chạy nhiều lần' },
              { t: 'proxy_buffering off (Nginx)', d: 'SSE cần stream ngay, không buffer' },
              { t: 'migrate deploy (không migrate dev)', d: 'Tránh mất data production' },
              { t: 'Redis phải đang chạy', d: 'Cache + SSE push badge phụ thuộc Redis' },
            ].map(({ t, d }) => (
              <div key={t} className="flex gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t}</p>
                  <p className="text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card">
          <h2 className="font-bold mb-4 text-sm flex items-center gap-2"><Database className="w-4 h-4 text-primary" /> Cấu hình VPS khuyến nghị</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 font-semibold text-muted-foreground">CCU</th>
                <th className="text-left py-1.5 font-semibold text-muted-foreground">RAM</th>
                <th className="text-left py-1.5 font-semibold text-muted-foreground">CPU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[
                { ccu: '< 500', ram: '2 GB', cpu: '1 vCPU' },
                { ccu: '500–2k', ram: '4 GB', cpu: '2 vCPU' },
                { ccu: '2k–5k', ram: '8 GB', cpu: '4 vCPU' },
              ].map(r => (
                <tr key={r.ccu}>
                  <td className="py-2 font-medium">{r.ccu}</td>
                  <td className="py-2 text-muted-foreground">{r.ram}</td>
                  <td className="py-2 text-muted-foreground">{r.cpu}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
            <p>🔍 Kiểm tra app log: <Inline>pm2 logs truyen-chu</Inline></p>
            <p>🔴 Redis test: <Inline>redis-cli ping</Inline> → PONG</p>
            <p>📡 Test SSE: <Inline>curl https://domain.com/api/notifications/stream</Inline></p>
          </div>
        </div>

      </div>
    </div>
  )
}
