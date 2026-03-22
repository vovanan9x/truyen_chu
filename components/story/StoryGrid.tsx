import StoryCard, { type StoryCardData } from './StoryCard'
import { cn } from '@/lib/utils'

interface StoryGridProps {
  stories: StoryCardData[]
  className?: string
  cols?: 2 | 3 | 4 | 5 | 6
}

export default function StoryGrid({ stories, className, cols = 5 }: StoryGridProps) {
  const colsClass = {
    2: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
  }[cols]

  if (stories.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">Không tìm thấy truyện nào.</p>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4', colsClass, className)}>
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} />
      ))}
    </div>
  )
}
