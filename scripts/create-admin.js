const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'admin@truyenchu.vn'
  const password = process.argv[3] || 'admin123456'
  const name = process.argv[4] || 'Admin'

  const hash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', passwordHash: hash, name },
    create: { email, name, passwordHash: hash, role: 'ADMIN' },
  })

  console.log(`✅ Tạo admin thành công:`)
  console.log(`   Email   : ${user.email}`)
  console.log(`   Tên     : ${user.name}`)
  console.log(`   Role    : ${user.role}`)
  console.log(`   Password: ${password}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
