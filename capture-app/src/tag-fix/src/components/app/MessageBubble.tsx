'use client'

import { useState } from 'react'
import { Item, Category, Project, Tag } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Check } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MessageBubbleProps {
  item: Item & { category?: Category; project?: Project; tags?: Tag[] }
  categories?: Category[]
  allTags?: Tag[]
  onReassign?: (itemId: string, categoryId: string) => void
  onDelete: (itemId: string) => void
  onTagClick?: (tagName: string) => void
  onTagsUpdate?: (itemId: string, tags: Tag[]) => void
  compact?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  reflection: '\u{1f4ad}',
  achievement: '\u{1f3c6}',
  project_update: '\u{1f4ca}',
  link: '\u{1f517}',
  habit_entry: '\u26a1',
}

export function MessageBubble({ item, categories, allTags, onReassign, onDelete, onTagClick, onTagsUpdate, compact }: MessageBubbleProps) {
  const [catOpen, setCatOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const topLevel = (categories ?? []).filter((c) => !c.parent_id)
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(item.created_at))

  const itemTags = item.tags ?? []
  const itemTagIds = new Set(itemTags.map(t => t.id))

  async function toggleTag(tag: Tag) {
    const currentIds = itemTags.map(t => t.id)
    let newIds: string[]
    let newTags: Tag[]

    if (itemTagIds.has(tag.id)) {
      newIds = currentIds.filter(id => id !== tag.id)
      newTags = itemTags.filter(t => t.id !== tag.id)
    } else {
      newIds = [...currentIds, tag.id]
      newTags = [...itemTags, tag]
    }

    onTagsUpdate?.(item.id, newTags)

    await fetch(`/api/items/${item.id}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_ids: newIds }),
    })
  }

  return (
    <div className="flex flex-col items-end gap-1 group">
      <div className="flex items-start gap-1.5 justify-end w-full">
        <button onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 mt-1 text-muted-foreground hover:text-destructive shrink-0" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{item.content}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-1 flex-wrap justify-end">
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{formattedDate}</span>

        {item.type && item.type !== 'task' && TYPE_LABELS[item.type] && (
          <Badge variant="outline" className="text-xs px-1.5 py-0">{TYPE_LABELS[item.type]}</Badge>
        )}

        {item.project && (
          <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
            {item.project.emoji} {item.project.name}
          </Badge>
        )}

        {itemTags.map((tag) => (
          <Badge key={tag.id} variant="outline"
            className="text-xs cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onTagClick?.(tag.name)}>
            {tag.name}
          </Badge>
        ))}

        {allTags && allTags.length > 0 && (
          <DropdownMenu open={tagOpen} onOpenChange={setTagOpen}>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 p-0.5 text-muted-foreground hover:text-foreground">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 max-h-64 overflow-y-auto">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Tags</div>
              {allTags.map((tag) => (
                <DropdownMenuItem key={tag.id} onClick={(e) => { e.preventDefault(); toggleTag(tag) }}
                  className="flex items-center justify-between">
                  <span>{tag.name}</span>
                  {itemTagIds.has(tag.id) && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!compact && categories && onReassign && (item.category_id || !item.project) && (
          <DropdownMenu open={catOpen} onOpenChange={setCatOpen}>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors">
                  {item.category?.emoji} {item.category?.name ?? 'Uncategorised'}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Move to...</div>
              {topLevel.map((cat) => (
                <DropdownMenuItem key={cat.id} onClick={() => { onReassign(item.id, cat.id); setCatOpen(false) }}
                  className={item.category_id === cat.id ? 'bg-accent' : ''}>
                  {cat.emoji} {cat.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
