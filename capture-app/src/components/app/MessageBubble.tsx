'use client'

import { useState } from 'react'
import { Item, Category, Project, Tag, Habit } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Check, CheckSquare, FolderOpen, Pencil } from 'lucide-react'

interface MessageBubbleProps {
  item: Item & { category?: Category; project?: Project; pending_habit?: Habit; tags?: Tag[] }
  allTags?: Tag[]
  allProjects?: Project[]
  onDelete: (itemId: string) => void
  onTagClick?: (tagName: string) => void
  onTagsUpdate?: (itemId: string, tags: Tag[]) => void
  onConvert?: (itemId: string, updates: Record<string, unknown>) => void
  compact?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  reflection: '\u{1f4ad}',
  achievement: '\u{1f3c6}',
  project_update: '\u{1f4ca}',
  link: '\u{1f517}',
  habit_entry: '\u26a1',
}

export function MessageBubble({ item, allTags, allProjects, onDelete, onTagClick, onTagsUpdate, onConvert, compact }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')

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
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_ids: newIds }),
    })
  }

  function makeTask() {
    onConvert?.(item.id, { type: 'task', completed_at: null })
    setShowMenu(false)
  }

  function removeTask() {
    onConvert?.(item.id, { type: 'reflection', completed_at: null })
    setShowMenu(false)
  }

  function linkToProject(projectId: string) {
    onConvert?.(item.id, { project_id: projectId, type: 'project_update' })
    setShowProjectPicker(false)
    setShowMenu(false)
  }

  function startEdit() {
    setEditContent(item.content)
    setEditMode(true)
    setShowMenu(false)
  }

  async function saveEdit() {
    const trimmed = editContent.trim()
    if (!trimmed || trimmed === item.content) { setEditMode(false); return }
    onConvert?.(item.id, { content: trimmed })
    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmed }),
    })
    setEditMode(false)
  }

  return (
    <div className="flex flex-col items-end gap-1 group relative">
      <div className="flex items-start gap-1.5 justify-end w-full">
        {!editMode && (
          <button onClick={() => onDelete(item.id)}
            className="opacity-30 group-hover:opacity-100 transition-opacity p-1.5 mt-1 text-muted-foreground hover:text-destructive shrink-0" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {editMode ? (
          <div className="flex-1 max-w-[85%] flex flex-col gap-1.5">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() } if (e.key === 'Escape') setEditMode(false) }}
              autoFocus
              rows={3}
              className="w-full rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed resize-none outline-none placeholder:text-primary-foreground/50"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditMode(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">Cancel</button>
              <button onClick={saveEdit} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full hover:bg-primary/90">Save</button>
            </div>
          </div>
        ) : (
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{item.content}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-1 flex-wrap justify-end">
        <span className="text-xs text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity">{formattedDate}</span>

        {item.type === 'task' && (
          <Badge variant="secondary" className="text-xs bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200">
            ☐ to-do
          </Badge>
        )}
        {item.type && item.type !== 'task' && TYPE_LABELS[item.type] && (
          <Badge variant="outline" className="text-xs px-1.5 py-0">{TYPE_LABELS[item.type]}</Badge>
        )}

        {item.project && (
          <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
            {item.project.emoji} {item.project.name}
          </Badge>
        )}

        {item.pending_habit && (
          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            {item.pending_habit.emoji} {item.pending_habit.name}
          </Badge>
        )}

        {itemTags.map((tag) => (
          <Badge key={tag.id} variant="outline"
            className="text-xs cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onTagClick?.(tag.name)}>
            {tag.name}
          </Badge>
        ))}

        {/* Action menu */}
        {!compact && (
          <div className="relative">
            <button onClick={() => { setShowMenu(!showMenu); setShowTagPicker(false); setShowProjectPicker(false) }}
              className="opacity-30 group-hover:opacity-100 transition-opacity focus:opacity-100 p-0.5 text-muted-foreground hover:text-foreground">
              <Plus className="w-3.5 h-3.5" />
            </button>

            {showMenu && !showTagPicker && !showProjectPicker && (
              <div className="absolute right-0 bottom-6 z-50 w-48 bg-background border rounded-lg shadow-lg py-1">
                <button onClick={startEdit}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { setShowTagPicker(true) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left">
                  <Plus className="w-3.5 h-3.5" /> Edit tags
                </button>
                {item.type !== 'task' ? (
                  <button onClick={makeTask}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left">
                    <CheckSquare className="w-3.5 h-3.5" /> Make to-do
                  </button>
                ) : (
                  <button onClick={removeTask}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left">
                    <CheckSquare className="w-3.5 h-3.5" /> Remove to-do
                  </button>
                )}
                <button onClick={() => { setShowProjectPicker(true) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left">
                  <FolderOpen className="w-3.5 h-3.5" /> {item.project ? 'Change project' : 'Link to project'}
                </button>
              </div>
            )}

            {showTagPicker && (
              <div className="absolute right-0 bottom-6 z-50 w-44 max-h-64 overflow-y-auto bg-background border rounded-lg shadow-lg py-1">
                <button onClick={() => setShowTagPicker(false)}
                  className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground">&larr; Back</button>
                {(allTags ?? []).map((tag) => (
                  <button key={tag.id} onClick={() => toggleTag(tag)}
                    className="flex items-center justify-between w-full px-2 py-1.5 text-sm hover:bg-accent text-left">
                    <span>{tag.name}</span>
                    {itemTagIds.has(tag.id) && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                ))}
              </div>
            )}

            {showProjectPicker && (
              <div className="absolute right-0 bottom-6 z-50 w-48 max-h-64 overflow-y-auto bg-background border rounded-lg shadow-lg py-1">
                <button onClick={() => setShowProjectPicker(false)}
                  className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground">&larr; Back</button>
                {item.project_id && (
                  <button onClick={() => linkToProject('')}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent text-muted-foreground">
                    Remove from project
                  </button>
                )}
                {(allProjects ?? []).filter(p => p.status === 'active').map((proj) => (
                  <button key={proj.id} onClick={() => linkToProject(proj.id)}
                    className={`flex items-center justify-between w-full px-2 py-1.5 text-sm hover:bg-accent text-left ${item.project_id === proj.id ? 'bg-accent' : ''}`}>
                    <span>{proj.emoji} {proj.name}</span>
                    {item.project_id === proj.id && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}