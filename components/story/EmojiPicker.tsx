'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Smile, Search, X } from 'lucide-react'

const EMOJI_CATEGORIES = [
  {
    id: 'popular', label: '⭐ Phổ biến',
    emojis: ['😂','❤️','😍','🥰','😭','😊','🔥','✨','🎉','😁','👍','🙏','🫶','💕','😅','🤣','😘','💯','🤍','🖤','💙','💚','💛','🧡','❤️‍🔥','😎','🥳','🤩','😤','😡']
  },
  {
    id: 'face', label: '😀 Mặt',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🫣','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😶‍🌫️','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','😵‍💫','🤯','🤠','🥸','🥳','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖']
  },
  {
    id: 'gesture', label: '👋 Cử chỉ',
    emojis: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🫶','🙌','👐','🤲','🙏','🤝','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','👅','👄','🫦','👁️','👀','🧠','🫀','🫁','🦷','🦴']
  },
  {
    id: 'heart', label: '❤️ Tim & Tình cảm',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','❤️‍🔥','❤️‍🩹','💔','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫀','😍','🥰','😘','💏','💑','💌','💋','👫','👬','👭','🌈','🌸','🌺','🌼','🌻','🌹','🌷','💐','🎀','🎁','🎊','🎉','🎈']
  },
  {
    id: 'animals', label: '🐶 Động vật',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🦆','🐧','🐦','🐤','🐣','🐥','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪲','🦟','🦗','🪳','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦞','🦀','🦐','🐡','🐠','🐟','🐬','🐋','🦈','🦭','🐊','🦁','🐘','🦏','🦛','🦍','🦧','🐃','🦬','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦩','🦢','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔']
  },
  {
    id: 'food', label: '🍕 Đồ ăn',
    emojis: ['🍏','🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🧄','🧅','🥔','🌽','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🫖','☕','🍵','🧋','🍶','🍺','🍻','🥂','🍷','🫗','🥃','🍸','🍹','🧉','🍾']
  },
  {
    id: 'travel', label: '✈️ Du lịch',
    emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🛞','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🛟','🪝','⛽','🚧','🚦','🚥','🗺️','🧭','🗼','🏰','🏯','🏟️','🗽','🗿','🗺️','🏔️','⛰️','🌋','🏕️','🏖️','🏗️','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏫','🏬','🏭','💒','🛕','⛪','🕌','🕍','🕋','⛩️','🏜️','🏝️','🏞️','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','🌌','🌠','🎇','🎆','🌇']
  },
  {
    id: 'activity', label: '⚽ Hoạt động',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥅','⛳','🪁','🛝','🏹','🎣','🤿','🥊','🥋','🛹','🛼','🛷','⛸️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🏇','🧘','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🎸','🪕','🎻','🪗','🎲','♟️','🎯','🎳','🎮','🕹️']
  },
  {
    id: 'objects', label: '💡 Đồ vật',
    emojis: ['💻','🖥️','🖨️','⌨️','🖱️','🖲️','💽','💾','💿','📀','📱','📲','☎️','📞','📟','📠','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💰','💴','💵','💶','💷','💸','💳','🪙','📧','📨','📩','📪','📫','📬','📭','📮','📯','📜','📃','📄','📑','🗒️','🗓️','📆','📅','🗑️','📇','📋','🗂️','🗃️','📊','📈','📉','📰','🗞️','📒','📓','📔','📕','📗','📘','📙','📚','📖','🔖','🏷️','🔑','🗝️','🔨','🪓','⛏️','⚒️','🛠️','🗡️','⚔️','🔧','🪛','🔩','⚙️','🗜️','⚖️','🦯','🔗','⛓️','🧲','🪜','🧰','🧲','🔬','🔭','📡','💉','🩹','🩺','🩻','💊','🩼','🩻']
  },
  {
    id: 'symbols', label: '💯 Ký hiệu',
    emojis: ['✅','❎','🚫','⛔','📵','🔞','💢','♨️','🚷','🚯','🚱','🚳','📴','📳','🔇','🔕','‼️','⁉️','❓','❔','❕','❗','⚠️','💯','🔔','🔕','💤','🔝','🆗','🆙','🆒','🆕','🆓','🆖','🆒','⭕','❌','✔️','💠','🔷','🔶','🔹','🔸','▪️','▫️','◾','◽','◼️','◻️','⬛','⬜','🔲','🔳','🏁','🚩','🎌','🏴','🏳️','🌈','🏴‍☠️']
  },
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('popular')
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = search.trim()
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(() => true) // all emojis when searching
    : EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.emojis ?? []

  // Simple search: filter by category label words or just show all
  const displayEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis)
    : filtered

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${open ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        title="Chèn emoji">
        <Smile className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute bottom-10 left-0 z-50 w-80 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm emoji..." autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"/>
              {search && <button onClick={() => setSearch('')}><X className="w-3 h-3 text-muted-foreground"/></button>}
            </div>
          </div>

          {/* Category tabs */}
          {!search && (
            <div className="flex overflow-x-auto scrollbar-none border-b border-border">
              {EMOJI_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  title={cat.label}
                  className={`flex-shrink-0 px-2 py-2 text-base transition-colors hover:bg-muted ${activeCategory === cat.id ? 'border-b-2 border-primary' : ''}`}>
                  {cat.emojis[0]}
                </button>
              ))}
            </div>
          )}

          {/* Label */}
          {!search && (
            <div className="px-3 pt-2 pb-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.label}
              </p>
            </div>
          )}

          {/* Emoji grid */}
          <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto">
            {displayEmojis.map((emoji, i) => (
              <button key={`${emoji}-${i}`} type="button" onClick={() => { onSelect(emoji); setOpen(false) }}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-lg hover:bg-muted transition-colors"
                title={emoji}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
