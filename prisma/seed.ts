import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Genres ──────────────────────────────────────────────────────────────────
const GENRES = [
  { name: 'Tiên Hiệp', slug: 'tien-hiep' },
  { name: 'Kiếm Hiệp', slug: 'kiem-hiep' },
  { name: 'Huyền Huyễn', slug: 'huyen-huyen' },
  { name: 'Ngôn Tình', slug: 'ngon-tinh' },
  { name: 'Đô Thị', slug: 'do-thi' },
  { name: 'Dị Giới', slug: 'di-gioi' },
  { name: 'Hài Hước', slug: 'hai-huoc' },
  { name: 'Võ Hiệp', slug: 'vo-hiep' },
  { name: 'Trinh Thám', slug: 'trinh-tham' },
  { name: 'Khoa Huyễn', slug: 'khoa-huyen' },
  { name: 'Lịch Sử', slug: 'lich-su' },
  { name: 'Huyền Bí', slug: 'huyen-bi' },
]

// ─── Stories ──────────────────────────────────────────────────────────────────
const STORIES = [
  {
    title: 'Đấu Phá Thương Khung',
    slug: 'dau-pha-thuong-khung',
    author: 'Thiên Tàm Thổ Đậu',
    description:
      'Thiếu niên tên Tiêu Viêm vốn là thiên tài trong tu luyện, nhưng vì một biến cố bí ẩn mà mất hết đấu khí. Từ thiên tài rơi xuống phế vật, anh phải đứng dậy bằng ý chí và sự trợ giúp của linh hồn cổ đại sống trong nhẫn ngọc để lấy lại vinh quang.',
    coverUrl: 'https://picsum.photos/seed/dptk/300/450',
    status: 'COMPLETED' as const,
    isFeatured: true,
    viewCount: 1850000,
    sourceUrl: 'https://truyen.tangthuvien.vn/doc-truyen/dau-pha-thuong-khung',
    sourceName: 'tangthuvien.vn',
    genres: ['tien-hiep', 'huyen-huyen', 'di-gioi'],
  },
  {
    title: 'Vô Cực Kiếm Thần',
    slug: 'vo-cuc-kiem-than',
    author: 'Mặc Hương Đồng Khứu',
    description:
      'Lâm Phong, người mang trọng trách bảo vệ kiếm phổ thất truyền, bị truy sát và rơi xuống vực thẳm. May mắn sống sót, anh bắt đầu hành trình tu luyện kiếm đạo cực hạn để trở thành kiếm thần vô song trong thiên hạ.',
    coverUrl: 'https://picsum.photos/seed/vckt/300/450',
    status: 'ONGOING' as const,
    isFeatured: true,
    viewCount: 920000,
    genres: ['kiem-hiep', 'tien-hiep', 'vo-hiep'],
  },
  {
    title: 'Toàn Chức Pháp Sư',
    slug: 'toan-chuc-phap-su',
    author: 'Loạn',
    description:
      'Trong một thế giới mà ma pháp thống trị tất cả, Mặc Phàm là một pháp sư thất nghiệp tưởng chừng vô năng nhưng lại ẩn chứa tiềm năng trở thành pháp sư toàn năng sử dụng mọi hệ ma pháp trong lịch sử.',
    coverUrl: 'https://picsum.photos/seed/tcps/300/450',
    status: 'COMPLETED' as const,
    isFeatured: true,
    viewCount: 1200000,
    genres: ['huyen-huyen', 'di-gioi', 'hai-huoc'],
  },
  {
    title: 'Thần Đạo Đan Tôn',
    slug: 'than-dao-dan-ton',
    author: 'Phong Đình Thiên Hạ',
    description:
      'Đan vương Tản Tiêu đời trước vì tiết lộ bí pháp luyện đan thần thượng mà bị bội phản, chết thảm. Đầu thai sang thiếu niên phế tài Tề Trinh Anh, anh sẽ dùng kiến thức luyện đan vô song để dẫm lên đỉnh cao thiên hạ.',
    coverUrl: 'https://picsum.photos/seed/tddt/300/450',
    status: 'ONGOING' as const,
    isFeatured: false,
    viewCount: 540000,
    genres: ['tien-hiep', 'di-gioi'],
  },
  {
    title: 'Yêu Thần Ký',
    slug: 'yeu-than-ky',
    author: 'Nhuận Lâm Tiền Tẩu',
    description:
      'Nhạc Minh Tuyền, một thanh niên bình thường vô tình lạc vào thế giới tu tiên kỳ diệu. Từ một người chẳng có linh căn, anh dần khám phá bí mật về nguồn gốc của mình và vươn lên trở thành yêu thần chi vương.',
    coverUrl: 'https://picsum.photos/seed/ytk/300/450',
    status: 'ONGOING' as const,
    isFeatured: true,
    viewCount: 760000,
    genres: ['tien-hiep', 'huyen-huyen', 'huyen-bi'],
  },
  {
    title: 'Đô Thị Tối Cường Y Thần',
    slug: 'do-thi-toi-cuong-y-than',
    author: 'Tiêu Tiêu Sầu',
    description:
      'Hoa Đà truyền nhân hạ sơn, trang bị y thuật thần thánh và mắt nhìn xuyên thấu dị tật, trở lại đô thị làm bác sĩ thiên tài. Không ai ngờ vị bác sĩ trẻ điển trai lại ẩn chứa sức mạnh có thể hồi sinh người chết.',
    coverUrl: 'https://picsum.photos/seed/dtcy/300/450',
    status: 'ONGOING' as const,
    isFeatured: false,
    viewCount: 380000,
    genres: ['do-thi', 'huyen-bi'],
  },
  {
    title: 'Kinh Hoa Yên Vân Lục',
    slug: 'kinh-hoa-yen-van-luc',
    author: 'Mai Đình Thú',
    description:
      'Triều đình loạn lạc, giang sơn nghiêng ngả. Nữ tướng quân Vân Thư, con gái của đại thần bị oan khuất, một mình xuyên qua mưa tên lửa đạn để lật ngược thiên hạ và đòi lại công bằng cho cha.',
    coverUrl: 'https://picsum.photos/seed/khyvl/300/450',
    status: 'COMPLETED' as const,
    isFeatured: false,
    viewCount: 290000,
    genres: ['lich-su', 'ngon-tinh'],
  },
  {
    title: 'Ma Thú Tiến Hóa',
    slug: 'ma-thu-tien-hoa',
    author: 'Tinh Linh Chi Lộ',
    description:
      'Thế giới hiện đại đột nhiên kết nối với không gian ma thú. Con người có thể ký kết hợp đồng với ma thú và trở thành thú đoàn sư. Hứa Minh, một học sinh bình thường, vô tình ký kết được một con ma thú tiến hóa vô hạn.',
    coverUrl: 'https://picsum.photos/seed/mtth/300/450',
    status: 'ONGOING' as const,
    isFeatured: false,
    viewCount: 210000,
    genres: ['khoa-huyen', 'huyen-huyen'],
  },
]

// ─── Sample chapter content ───────────────────────────────────────────────────
function makeChapterContent(storyTitle: string, chNum: number): string {
  const intros = [
    `Buổi sáng hôm ấy, ánh mặt trời chiếu rọi qua khung cửa sổ, hắt lên khuôn mặt của nhân vật chính một làn ánh sáng vàng rực rỡ.`,
    `Tiếng gió rít qua núi rừng xanh thẳm, mang theo hơi lạnh của buổi sớm mai khiến mọi người rùng mình co ro.`,
    `Một năm đã trôi qua kể từ sự kiện biến thiên kinh thiên động địa đó. Thế giới chưa kịp bình yên đã lại nổi sóng.`,
    `Trên đỉnh ngọn núi cao vút giữa mây trắng bảng lảng, một bóng người đứng yên lặng ngắm nhìn cảnh vật bên dưới.`,
    `Tin tức lan ra như sóng gió, khiến cả thành trấn chấn động. Không ai ngờ được điều này lại xảy ra.`,
  ]

  const middles = [
    `"Ngươi đã sẵn sàng chưa?" — giọng nói từ phía sau vang lên, trầm và ấm áp nhưng ẩn chứa áp lực vô hình.

Nhân vật chính hít một hơi thật sâu, rồi gật đầu. Không còn đường lùi nữa.

Đây là thử thách mà họ đã chuẩn bị suốt bao nhiêu năm trời. Không thể thất bại.`,
    `Đám đông xung quanh nhôn nhao bàn tán. Đây là cơ hội ngàn năm có một, ai bỏ lỡ sẽ hối hận cả đời.

Nhưng cơ hội lớn đi kèm nguy hiểm lớn. Không phải ai cũng đủ bản lĩnh để đứng vững trước cám dỗ và thử thách.`,
    `Ánh mắt hai người giao nhau trong khoảnh khắc, mang theo ngàn lời chưa nói. Giây phút ấy dài đến vô tận.

Cuối cùng, một trong hai quay đi. Câu chuyện vẫn phải tiếp tục, dù lòng có đau đớn đến đâu.`,
  ]

  const endings = [
    `Khi trời tối hẳn, mọi thứ đã an bài. Chương tiếp theo của cuộc đời họ chính thức bắt đầu từ đây.`,
    `Gió lại nổi, mây lại cuộn. Thiên hạ này rộng lớn, còn bao nhiêu điều chờ đợi phía trước.

Hành trình chưa kết thúc — mà mới chỉ thật sự bắt đầu.`,
    `Nhân vật chính nhìn lên bầu trời đêm đầy sao, lòng tràn đầy quyết tâm. Dù gian nan thế nào, họ sẽ không bỏ cuộc.

${storyTitle} — chương ${chNum} kết thúc tại đây. Chương tiếp theo sẽ hé lộ những bí mật còn ẩn khuất.`,
  ]

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  return [
    pick(intros),
    '',
    `Đây là nội dung chương ${chNum} của truyện "${storyTitle}". Câu chuyện tiếp tục mở ra những tình tiết hấp dẫn, đưa người đọc vào thế giới đầy màu sắc và phiêu lưu.`,
    '',
    pick(middles),
    '',
    `Thời gian thấm thoắt, ngày qua ngày trôi đi. Nhân vật chính ngày càng trưởng thành hơn qua từng thử thách, từng cuộc chiến và từng lần đứng dậy sau vấp ngã.`,
    '',
    `Độc giả thân mến, đây là nội dung mẫu được tạo tự động để minh họa chức năng của website TruyenChu. Trong phiên bản thực tế, nội dung sẽ được crawl từ các nguồn uy tín và đã được kiểm duyệt cẩn thận trước khi đăng tải.`,
    '',
    pick(endings),
  ].join('\n')
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...\n')

  // 1. Admin user
  const adminHash = await bcrypt.hash('admin123456', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@truyenchu.vn' },
    update: { role: 'ADMIN', passwordHash: adminHash, name: 'Admin' },
    create: { email: 'admin@truyenchu.vn', name: 'Admin', passwordHash: adminHash, role: 'ADMIN' },
  })
  console.log(`✅ Admin: ${admin.email} / admin123456`)

  // 2. Genres
  console.log('\n📚 Tạo thể loại...')
  const genreMap: Record<string, string> = {}
  for (const g of GENRES) {
    const genre = await prisma.genre.upsert({
      where: { slug: g.slug },
      update: {},
      create: g,
    })
    genreMap[g.slug] = genre.id
  }
  console.log(`   ${GENRES.length} thể loại đã tạo.`)

  // 3. Stories + chapters
  console.log('\n📖 Tạo truyện và chương...')
  for (const s of STORIES) {
    const { genres: genreSlugs, ...storyData } = s

    const story = await prisma.story.upsert({
      where: { slug: storyData.slug },
      update: { viewCount: storyData.viewCount, isFeatured: storyData.isFeatured },
      create: storyData,
    })

    // Genres relation
    await prisma.storyGenre.deleteMany({ where: { storyId: story.id } })
    for (const slug of genreSlugs) {
      if (genreMap[slug]) {
        await prisma.storyGenre.upsert({
          where: { storyId_genreId: { storyId: story.id, genreId: genreMap[slug] } },
          update: {},
          create: { storyId: story.id, genreId: genreMap[slug] },
        })
      }
    }

    // Chapters (10 per story, first 2 locked)
    const chapterCount = await prisma.chapter.count({ where: { storyId: story.id } })
    if (chapterCount === 0) {
      for (let i = 1; i <= 10; i++) {
        const isLocked = i > 8
        await prisma.chapter.create({
          data: {
            storyId: story.id,
            chapterNum: i,
            title: i === 1 ? 'Khởi Đầu' : i === 2 ? 'Bước Lên Đỉnh Cao' : `Chương ${i}`,
            content: makeChapterContent(story.title, i),
            wordCount: Math.floor(Math.random() * 1500) + 1500,
            isLocked,
            coinCost: isLocked ? 2 : 0,
          },
        })
      }
    }

    console.log(`   ✓ "${story.title}" (${story.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra'})`)
  }

  // 4. Update story updatedAt to stagger
  console.log('\n🕒 Cập nhật timestamps...')
  const allStories = await prisma.story.findMany({ select: { id: true } })
  for (let i = 0; i < allStories.length; i++) {
    const daysAgo = i * 2
    await prisma.story.update({
      where: { id: allStories[i].id },
      data: { updatedAt: new Date(Date.now() - daysAgo * 86400000) },
    })
  }

  console.log('\n🎉 Seed hoàn tất!')
  console.log('─────────────────────────────────')
  console.log(`Admin: admin@truyenchu.vn / admin123456`)
  console.log(`${STORIES.length} truyện, ${GENRES.length} thể loại, ${STORIES.length * 10} chương`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
