'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Item, Category, Project } from '../../../src/types/database'
import { createClient } from '../../../src/lib/supabase/client'
import { BottomNav } from '../../../src/components/app/BottomNav'
import { ChatInput } from '../../../src/components/app/ChatInput'
import { Toaster } from '../../../src/components/ui/sonner'
import { toast } from 'sonner'
import { Check, Trash2 } from 'lucide-react'

export default function TodosPage() {
  const router = useRouter()
  const [items, setItems] = useState<(Item & { category?: Category; project?: Project })[]>([])
  const [completing, setCompleting] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      loadTodos()
    })
  }, [router])

  const loadTodos = useCallback(async () => {
    // Get tasks that haven't been completed
    const res = await fetch('/api/items?type=task')
    if (res.ok) {
      const all = await res.json()
      // Filter out completed ones client-side (completed_at is null for active todos)
      setItems(all.filter((i: Item) => !i.completed_at))
    }
  }, [])

  async function handleComplete(itemId: string) {
    setCompleting((prev) => new Set(prev).add(itemId))

    // Wait for animation then mark as achievement
    setTimeout(async () => {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })

      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemId))
        toast.success('Done! Moved to today\u2019s achievements')
      } else {
        toast.error('Failed to complete')
      }

      setCompleting((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }, 300)
  }

  async function handleDelete(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); loadTodos() }
  }

  async function handleSubmit(message: string) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message, type: 'task', categorized_by: 'manual' }),
      })
      if (res.ok) {
        const saved = await res.json()
        setItems((prev) => [saved, ...prev])
      } else toast.error('Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const formattedDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit' }).format(d)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(d)
    return new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric' }).format(d)
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-4 h-12 border-b shrink-0">
        <h1 className="font-semibold text-base">✅ To-dos</h1>
        <span className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-2">
          {items.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-sm">All done! Add a to-do below.</p>
            </div>
          )}

          {items.map((item) => {
            const isCompleting = completing.has(item.id)
            return (
              <div key={item.id}
                className={`flex items-start gap-3 py-3 border-b border-border/50 transition-all duration-300 group ${isCompleting ? 'opacity-0 translate-x-4' : ''}`}>
                <button onClick={() => handleComplete(item.id)}
                  className="mt-0.5 w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center justify-center shrink-0 transition-colors group/check">
                  <Check className="w-3 h-3 text-emerald-500 opacity-0 group-hover/check:opacity-100 transition-opacity" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed">{item.content}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formattedDate(item.created_at)}</span>
                    {item.category && (
                      <span className="text-xs text-muted-foreground">{item.category.emoji} {item.category.name}</span>
                    )}
                    {item.project && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">{item.project.emoji} {item.project.name}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 mt-0.5 text-muted-foreground hover:text-destructive" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <ChatInput onSubmit={handleSubmit} disabled={submitting} placeholder="Add a to-do…" />
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  )
}
