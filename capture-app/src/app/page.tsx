'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Item, Category, KeywordRule } from '@/types/database'
import { matchKeywordRules } from '@/lib/categorize'
import { createClient } from '@/lib/supabase/client'
import { ChatInput } from '@/components/app/ChatInput'
import { MessageBubble } from '@/components/app/MessageBubble'
import { CategoryFilter } from '@/components/app/CategoryFilter'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [items, setItems] = useState<(Item & { category?: Category })[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      loadData()
    })
  }, [router])

  const loadData = useCallback(async () => {
    const [itemsRes, catsRes, rulesRes] = await Promise.all([
      fetch('/api/items'),
      fetch('/api/categories'),
      fetch('/api/keyword-rules'),
    ])
    if (itemsRes.ok) setItems(await itemsRes.json())
    if (catsRes.ok) setCategories(await catsRes.json())
    if (rulesRes.ok) setKeywordRules(await rulesRes.json())
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items.length])

  const filteredItems = selectedCategory
    ? items.filter((i) => i.category_id === selectedCategory)
    : items

  const itemCounts: Record<string, number> = {}
  for (const item of items) {
    if (item.category_id) {
      itemCounts[item.category_id] = (itemCounts[item.category_id] ?? 0) + 1
    }
  }

  async function handleSubmit(message: string) {
    setSubmitting(true)

    const keywordMatch = matchKeywordRules(message, keywordRules)

    const tempId = `temp-${Date.now()}`
    const tempCategory = keywordMatch
      ? categories.find((c) => c.id === keywordMatch)
      : undefined

    const optimisticItem: Item & { category?: Category } = {
      id: tempId,
      user_id: '',
      content: message,
      category_id: keywordMatch ?? '',
      created_at: new Date().toISOString(),
      categorized_by: keywordMatch ? 'keyword' : 'ai',
      category: tempCategory,
    }
    setItems((prev) => [optimisticItem, ...prev])

    try {
      let categoryId = keywordMatch
      let method: string = keywordMatch ? 'keyword' : 'ai'

      if (!categoryId) {
        const catRes = await fetch('/api/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, categories }),
        })
        if (catRes.ok) {
          const result = await catRes.json()
          categoryId = result.category_id
          method = result.method
        }
      }

      const saveRes = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message, category_id: categoryId, categorized_by: method }),
      })

      if (saveRes.ok) {
        const saved = await saveRes.json()
        setItems((prev) => prev.map((i) => (i.id === tempId ? saved : i)))
      } else {
        throw new Error('Save failed')
      }
    } catch {
      toast.error('Failed to save note')
      setItems((prev) => prev.filter((i) => i.id !== tempId))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReassign(itemId: string, categoryId: string) {
    const category = categories.find((c) => c.id === categoryId)
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, category_id: categoryId, category } : i))
    )
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: categoryId }),
    })
    if (!res.ok) {
      toast.error('Failed to update category')
      loadData()
    }
  }

  async function handleDelete(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete')
      loadData()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-4 h-14 border-b shrink-0">
        <h1 className="font-semibold text-base">📋 Capture</h1>
        <Link
          href="/settings"
          className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </header>

      <CategoryFilter
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        itemCounts={itemCounts}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {filteredItems.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-sm">
                {selectedCategory
                  ? 'Nothing in this category yet'
                  : 'Type anything below to get started'}
              </p>
            </div>
          )}
          {[...filteredItems].reverse().map((item) => (
            <MessageBubble
              key={item.id}
              item={item}
              categories={categories}
              onReassign={handleReassign}
              onDelete={handleDelete}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSubmit={handleSubmit} disabled={submitting} />
      <Toaster position="top-center" />
    </div>
  )
}
