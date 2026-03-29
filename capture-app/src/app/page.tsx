'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Item, Category, KeywordRule, Project, Tag } from '@/types/database'
import { matchKeywordRules } from '@/lib/categorize'
import { createClient } from '@/lib/supabase/client'
import { ChatInput } from '@/components/app/ChatInput'
import { MessageBubble } from '@/components/app/MessageBubble'
import { BottomNav } from '@/components/app/BottomNav'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Search, X } from 'lucide-react'

type FilterMode = 'category' | 'tag'

export default function Home() {
  const router = useRouter()
  const [items, setItems] = useState<(Item & { category?: Category; project?: Project; tags?: Tag[] })[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filterMode, setFilterMode] = useState<FilterMode>('category')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      loadData()
    })
  }, [router])

  const loadData = useCallback(async () => {
    const [itemsRes, catsRes, rulesRes, tagsRes, projRes] = await Promise.all([
      fetch('/api/items'),
      fetch('/api/categories'),
      fetch('/api/keyword-rules'),
      fetch('/api/tags'),
      fetch('/api/projects'),
    ])
    if (itemsRes.ok) setItems(await itemsRes.json())
    if (catsRes.ok) setCategories(await catsRes.json())
    if (rulesRes.ok) setKeywordRules(await rulesRes.json())
    if (tagsRes.ok) setTags(await tagsRes.json())
    if (projRes.ok) setProjects(await projRes.json())
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [items.length])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      if (!selectedCategory && !selectedTag) loadData()
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/items?search=${encodeURIComponent(searchQuery)}`)
      if (res.ok) setItems(await res.json())
      setSearching(false)
    }, 300)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [searchQuery, selectedCategory, selectedTag, loadData])

  // Filter
  useEffect(() => {
    if (searchQuery) return
    if (selectedTag) {
      fetch(`/api/items?tag=${encodeURIComponent(selectedTag)}`)
        .then(r => r.ok ? r.json() : []).then(setItems)
    } else if (selectedCategory) {
      fetch(`/api/items?category_id=${selectedCategory}`)
        .then(r => r.ok ? r.json() : []).then(setItems)
    } else {
      loadData()
    }
  }, [selectedCategory, selectedTag, searchQuery, loadData])

  async function handleSubmit(message: string) {
    setSubmitting(true)
    const keywordMatch = matchKeywordRules(message, keywordRules)

    const tempId = `temp-${Date.now()}`
    const tempCategory = keywordMatch ? categories.find((c) => c.id === keywordMatch) : undefined
    const optimisticItem: Item & { category?: Category } = {
      id: tempId, user_id: '', content: message, type: 'task',
      category_id: keywordMatch ?? null, project_id: null, pending_habit_id: null, completed_at: null,
      created_at: new Date().toISOString(), categorized_by: keywordMatch ? 'keyword' : 'ai',
      category: tempCategory,
    }
    setItems((prev) => [optimisticItem, ...prev])

    try {
      let routing = {
        type: 'task' as string, category_id: keywordMatch as string | null,
        project_id: null as string | null, pending_habit_id: null as string | null,
        habits: [] as { habit_id: string; value: number; note?: string }[],
        tags: [] as string[], method: keywordMatch ? 'keyword' : 'ai',
      }

      if (!keywordMatch) {
        const catRes = await fetch('/api/categorize', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        })
        if (catRes.ok) routing = await catRes.json()
      }

      const saveRes = await fetch('/api/items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message, type: routing.type, category_id: routing.category_id,
          project_id: routing.project_id, pending_habit_id: routing.pending_habit_id,
          categorized_by: routing.method, habits: routing.habits, tags: routing.tags,
        }),
      })

      if (saveRes.ok) {
        const saved = await saveRes.json()
        setItems((prev) => prev.map((i) => (i.id === tempId ? saved : i)))
        if (routing.habits?.length > 0) toast.success(`Logged ${routing.habits.length} habit${routing.habits.length > 1 ? 's' : ''}`)
      } else throw new Error('Save failed')
    } catch {
      toast.error('Failed to save note')
      setItems((prev) => prev.filter((i) => i.id !== tempId))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); loadData() }
  }

  function handleTagClick(tagName: string) {
    setFilterMode('tag')
    setSelectedTag(tagName)
    setSelectedCategory(null)
  }

  function handleTagsUpdate(itemId: string, newTags: Tag[]) {
    setItems((prev) => prev.map((i) =>
      i.id === itemId ? { ...i, tags: newTags } : i
    ))
  }

  async function handleConvert(itemId: string, updates: Record<string, unknown>) {
    setItems((prev) => prev.map((i) => {
      if (i.id !== itemId) return i
      const updated = { ...i, ...updates }
      if (updates.project_id === '') {
        updated.project_id = null
        updated.project = undefined
      }
      return updated as typeof i
    }))
    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates.project_id === '' ? { ...updates, project_id: null } : updates),
    })
    loadData()
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-4 h-12 border-b shrink-0">
        {showSearch ? (
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..." className="flex-1 text-sm bg-transparent outline-none" autoFocus />
            <button onClick={() => { setShowSearch(false); setSearchQuery('') }} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-semibold text-base">📋 Capture</h1>
            <button onClick={() => setShowSearch(true)} className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2">
              <Search className="w-5 h-5" />
            </button>
          </>
        )}
      </header>

      {!showSearch && (
        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto border-b shrink-0">
          <button onClick={() => { setFilterMode('category'); setSelectedTag(null); setSelectedCategory(null) }}
            className={`text-xs px-2.5 py-1 rounded-full shrink-0 font-medium ${filterMode === 'category' && !selectedCategory && !selectedTag ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
            All
          </button>

          {filterMode === 'category' ? (
            <>
              {categories.filter(c => !c.parent_id).map((cat) => (
                <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setSelectedTag(null) }}
                  className={`text-xs px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${selectedCategory === cat.id ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
                  {cat.emoji} {cat.name}
                </button>
              ))}
              {tags.length > 0 && <div className="w-px bg-border shrink-0 mx-1" />}
              {tags.map((tag) => (
                <button key={tag.id} onClick={() => { setFilterMode('tag'); setSelectedTag(tag.name); setSelectedCategory(null) }}
                  className={`text-xs px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${selectedTag === tag.name ? 'bg-foreground text-background' : 'bg-muted/70 text-muted-foreground italic'}`}>
                  {tag.name}
                </button>
              ))}
            </>
          ) : (
            <>
              {tags.map((tag) => (
                <button key={tag.id} onClick={() => { setSelectedTag(tag.name); setSelectedCategory(null) }}
                  className={`text-xs px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${selectedTag === tag.name ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
                  {tag.name}
                </button>
              ))}
              {categories.filter(c => !c.parent_id).length > 0 && <div className="w-px bg-border shrink-0 mx-1" />}
              {categories.filter(c => !c.parent_id).map((cat) => (
                <button key={cat.id} onClick={() => { setFilterMode('category'); setSelectedCategory(cat.id); setSelectedTag(null) }}
                  className={`text-xs px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${selectedCategory === cat.id ? 'bg-foreground text-background' : 'bg-muted/70 text-muted-foreground'}`}>
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {searching && <div className="text-center py-2 text-xs text-muted-foreground">Searching…</div>}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {items.length === 0 && !searching && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-sm">
                {searchQuery ? 'No results found' : selectedCategory ? 'Nothing in this category yet'
                  : selectedTag ? 'No notes with this tag' : 'Type anything below to get started'}
              </p>
            </div>
          )}
          {[...items].reverse().map((item) => (
            <MessageBubble key={item.id} item={item} allTags={tags} allProjects={projects}
              onDelete={handleDelete} onTagClick={handleTagClick} onTagsUpdate={handleTagsUpdate} onConvert={handleConvert} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSubmit={handleSubmit} disabled={submitting} />
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  )
}