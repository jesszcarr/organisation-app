'use client'

import { useState } from 'react'
import { Item, Category } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MessageBubbleProps {
  item: Item & { category?: Category }
  categories: Category[]
  onReassign: (itemId: string, categoryId: string) => void
  onDelete: (itemId: string) => void
}

export function MessageBubble({ item, categories, onReassign, onDelete }: MessageBubbleProps) {
  const [open, setOpen] = useState(false)
  const topLevel = categories.filter((c) => !c.parent_id)

  const formattedDate = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(item.created_at))

  return (
    <div className="flex flex-col items-end gap-1 group">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 shadow-sm">
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {item.content}
        </p>
      </div>

      <div className="flex items-center gap-2 px-1">
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          {formattedDate}
        </span>

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none">
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
              >
                {item.category?.emoji} {item.category?.name ?? 'Uncategorized'}
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Move to…
            </div>
            {topLevel.map((cat) => (
              <DropdownMenuItem
                key={cat.id}
                onClick={() => {
                  onReassign(item.id, cat.id)
                  setOpen(false)
                }}
                className={item.category_id === cat.id ? 'bg-accent' : ''}
              >
                {cat.emoji} {cat.name}
              </DropdownMenuItem>
            ))}
            <div className="h-px bg-border my-1" />
            <DropdownMenuItem
              onClick={() => {
                onDelete(item.id)
                setOpen(false)
              }}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
