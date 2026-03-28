'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Category, KeywordRule } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('📌')
  const [newCatParent, setNewCatParent] = useState<string>('')
  const [newKeyword, setNewKeyword] = useState('')
  const [newKeywordCat, setNewKeywordCat] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else loadData()
    })
  }, [router])

  async function loadData() {
    const [catsRes, rulesRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/keyword-rules'),
    ])
    if (catsRes.ok) {
      const cats = await catsRes.json()
      setCategories(cats)
      if (cats.length > 0 && !newKeywordCat) setNewKeywordCat(cats[0].id)
    }
    if (rulesRes.ok) setKeywordRules(await rulesRes.json())
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    setLoading(true)
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCatName.trim(),
        emoji: newCatEmoji,
        parent_id: newCatParent || null,
        sort_order: categories.length,
      }),
    })
    if (res.ok) {
      const cat = await res.json()
      setCategories((prev) => [...prev, cat])
      setNewCatName('')
      setNewCatEmoji('📌')
      setNewCatParent('')
      toast.success(`Added "${cat.name}"`)
    } else {
      toast.error('Failed to add category')
    }
    setLoading(false)
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      toast.success('Category deleted')
    } else {
      toast.error('Failed to delete')
    }
  }

  async function addKeywordRule() {
    if (!newKeyword.trim() || !newKeywordCat) return
    setLoading(true)
    const res = await fetch('/api/keyword-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: newKeyword.trim().toLowerCase(), category_id: newKeywordCat }),
    })
    if (res.ok) {
      const rule = await res.json()
      setKeywordRules((prev) => [...prev, rule])
      setNewKeyword('')
      toast.success('Keyword rule added')
    } else {
      toast.error('Failed to add rule')
    }
    setLoading(false)
  }

  async function deleteKeywordRule(id: string) {
    const res = await fetch(`/api/keyword-rules/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setKeywordRules((prev) => prev.filter((r) => r.id !== id))
    } else {
      toast.error('Failed to delete')
    }
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const topLevel = categories.filter((c) => !c.parent_id)

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 h-14 border-b sticky top-0 bg-background z-10">
        <Link href="/" className="text-muted-foreground hover:text-foreground -ml-2 p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold">Settings</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-10">

        {/* Categories */}
        <section className="space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Categories
          </h2>

          <div className="space-y-1">
            {topLevel.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50">
                  <span className="text-sm">{cat.emoji} {cat.name}</span>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Sub-categories */}
                {categories.filter((c) => c.parent_id === cat.id).map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between py-2 px-3 pl-8 rounded-lg hover:bg-muted/50"
                  >
                    <span className="text-sm text-muted-foreground">
                      {sub.emoji} {sub.name}
                    </span>
                    <button
                      onClick={() => deleteCategory(sub.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Add category form */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Add category</p>
            <div className="flex gap-2">
              <Input
                value={newCatEmoji}
                onChange={(e) => setNewCatEmoji(e.target.value)}
                className="w-16 text-center"
                maxLength={2}
                placeholder="📌"
              />
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name"
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={newCatParent}
                onChange={(e) => setNewCatParent(e.target.value)}
                className="flex-1 text-sm border rounded-md px-3 py-2 bg-background"
              >
                <option value="">Top-level category</option>
                {topLevel.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    Sub-category of: {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
              <Button onClick={addCategory} disabled={!newCatName.trim() || loading} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </section>

        {/* Keyword Rules */}
        <section className="space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Keyword Rules
          </h2>
          <p className="text-sm text-muted-foreground">
            When a note contains a keyword, it&apos;s instantly categorized without needing AI.
          </p>

          <div className="space-y-1">
            {keywordRules.map((rule) => {
              const cat = categories.find((c) => c.id === rule.category_id)
              return (
                <div key={rule.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{rule.keyword}</code>
                    <span className="text-muted-foreground text-xs">→</span>
                    <Badge variant="secondary" className="text-xs">
                      {cat?.emoji} {cat?.name ?? 'Unknown'}
                    </Badge>
                  </div>
                  <button
                    onClick={() => deleteKeywordRule(rule.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
            {keywordRules.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 px-3">No keyword rules yet</p>
            )}
          </div>

          {/* Add keyword rule form */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Add keyword rule</p>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="keyword"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && addKeywordRule()}
              />
              <select
                value={newKeywordCat}
                onChange={(e) => setNewKeywordCat(e.target.value)}
                className="text-sm border rounded-md px-3 py-2 bg-background"
              >
                {topLevel.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
              <Button onClick={addKeywordRule} disabled={!newKeyword.trim() || !newKeywordCat || loading} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Account
          </h2>
          <Button variant="outline" onClick={signOut} className="w-full">
            Sign out
          </Button>
        </section>
      </div>

      <Toaster position="top-center" />
    </div>
  )
}
