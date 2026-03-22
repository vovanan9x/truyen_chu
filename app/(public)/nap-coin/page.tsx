import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import NapCoinClient from './NapCoinClient'

export const metadata: Metadata = {
  title: 'Nạp xu - TruyenChu',
  description: 'Nạp xu để mở khoá chương VIP trên TruyenChu',
}

const PACKAGES = [
  { coins: 50,  price: 5000,  bonus: 0,   label: 'Gói thử' },
  { coins: 120, price: 10000, bonus: 20,  label: 'Phổ biến', highlight: true },
  { coins: 260, price: 20000, bonus: 60,  label: 'Tiết kiệm' },
  { coins: 700, price: 50000, bonus: 200, label: 'Giá trị nhất', badge: '🔥' },
]

export default async function NapCoinPage() {
  const rawSettings = await prisma.setting.findMany()
  const settings: Record<string, string> = {}
  for (const s of rawSettings) settings[s.key] = s.value

  return <NapCoinClient settings={settings} packages={PACKAGES} />
}
