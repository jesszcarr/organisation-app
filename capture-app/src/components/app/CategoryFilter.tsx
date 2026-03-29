'use client'

import { Category } from '../../../src/types/database'
import { cn } from '../../../src/lib/utils'

interface CategoryFilterProps {
  categories: Category[]
  selected: string | null
  onSelect: (categoryId: string | null) => void
  itemCounts: Record<string, number>
}

export function CategoryFilter({
  categories,
  selected,
  onSelect,
  itemCounts,
}: CategoryFilterProps) {
  const topLevel = categories.filter((c) => !c.parent_id)

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2 border-b">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'flex-shrink-0 text-sm px-3 py-1.5 rounded-full transition-colors font-medium',
          selected === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        All
      </button>
      {topLevel.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'flex-shrink-0 text-sm px-3 py-1.5 rounded-full transition-colors font-medium flex items-center gap-1',
            selected === cat.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <span>{cat.emoji}</span>
          <span>{cat.name}</span>
          {itemCounts[cat.id] != null && (
            <span
              className={cn(
                'text-xs rounded-full px-1.5',
                selected === cat.id
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-background text-muted-foreground'
              )}
            >
              {itemCounts[cat.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
