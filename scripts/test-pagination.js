const cheerio = require('cheerio');

const NEXT_PAGE_SELECTORS = [
  'a[rel="next"]',
  '.pagination a:contains("Trang tiếp")',
  '.pagination a:contains("Trang sau")',
  '.pagination a[aria-label*="Next"]',
  '.pagination a[aria-label*="ext"]',
  '.pagination a:has(.glyphicon-menu-right)',
  '.pagination a:has(i.fa-angle-right)',
  '.pagination a:has(i.fa-chevron-right)',
  '.pagination .next a',
  '.pagination li.next a',
  'li.next a',
  '.pager-next a',
  'a.next-page',
];

async function test() {
  const res = await fetch('https://truyenfull.vision/danh-sach/truyen-moi/trang-2/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  for (const sel of NEXT_PAGE_SELECTORS) {
    try {
      const el = $(sel).first()
      let href = el.attr('href')
      
      if (!href && sel.includes(':has')) {
        const iconSel = sel.match(/:has\((.*?)\)/)?.[1]
        console.log('trying icon fallback for', iconSel);
        if (iconSel) {
          href = $(iconSel).closest('a').attr('href')
        }
      }
      if (href) {
        console.log('Match found by selector:', sel, 'href:', href);
        break;
      }
    } catch(e) {
      console.log('err on sel', sel, e.message);
    }
  }
}

test();
