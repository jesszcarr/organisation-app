'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Category, KeywordRule, Habit, Project, Tag } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { BottomNav } from '@/components/app/BottomNav'
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  // New item state
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('📌')
  const [newCatParent, setNewCatParent] = useState<string>('')
  const [newKeyword, setNewKeyword] = useState('')
  const [newKeywordCat, setNewKeywordCat] = useState<string>('')
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitEmoji, setNewHabitEmoji] = useState('✅')
  const [newHabitType, setNewHabitType] = useState<string>('binary')
  const [newHabitUnit, setNewHabitUnit] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectEmoji, setNewProjectEmoji] = useState('📁')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [loading, setLoading] = useState(false)

  // Edit state — habits
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null)
  const [editingHabitName, setEditingHabitName] = useState('')
  const [editingHabitEmoji, setEditingHabitEmoji] = useState('')

  // Edit state — projects
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = useState('')
  const [editingProjectEmoji, setEditingProjectEmoji] = useState('')
  const [editingProjectDesc, setEditingProjectDesc] = useState('')
  const [editingProjectAliases, setEditingProjectAliases] = useState('')
  const [editingProjectStatus, setEditingProjectStatus] = useState<'active' | 'paused' | 'done'>('active')

  // Edit state — tags
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingTagName, setEditingTagName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else loadData()
    })
  }, [router])

  async function loadData() {
    const [catsRes, rulesRes, habitsRes, projectsRes, tagsRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/keyword-rules'),
      fetch('/api/habits'),
      fetch('/api/projects'),
      fetch('/api/tags'),
    ])
    if (catsRes.ok) {
      const cats = await catsRes.json()
      setCategories(cats)
      if (cats.length > 0 && !newKeywordCat) setNewKeywordCat(cats[0].id)
    }
    if (rulesRes.ok) setKeywordRules(await rulesRes.json())
    if (habitsRes.ok) setHabits(await habitsRes.json())
    if (projectsRes.ok) setProjects(await projectsRes.json())
    if (tagsRes.ok) setTags(await tagsRes.json())
  }

  // --- Categories ---
  async function addCategory() {
    if (!newCatName.trim()) return
    setLoading(true)
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim(), emoji: newCatEmoji, parent_id: newCatParent || null, sort_order: categories.length }),
    })
    if (res.ok) {
      const cat = await res.json()
      setCategories(prev => [...prev, cat])
      setNewCatName('')
      setNewCatEmoji('📌')
      setNewCatParent('')
      toast.success(`Added "${cat.name}"`)
    } else toast.error('Failed to add category')
    setLoading(false)
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (res.ok) { setCategories(prev => prev.filter(c => c.id !== id)); toast.success('Deleted') }
    else toast.error('Failed to delete')
  }

  // --- Keyword rules ---
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
      setKeywordRules(prev => [...prev, rule])
      setNewKeyword('')
      toast.success('Rule added')
    } else toast.error('Failed to add rule')
    setLoading(false)
  }

  async function deleteKeywordRule(id: string) {
    const res = await fetch(`/api/keyword-rules/${id}`, { method: 'DELETE' })
    if (res.ok) setKeywordRules(prev => prev.filter(r => r.id !== id))
    else toast.error('Failed to delete')
  }

  // --- Habits ---
  async function addHabit() {
    if (!newHabitName.trim()) return
    setLoading(true)
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newHabitName.trim(),
        emoji: newHabitEmoji,
        track_type: newHabitType,
        unit: newHabitType === 'numeric' ? newHabitUnit || null : null,
        sort_order: habits.length,
      }),
    })
    if (res.ok) {
      const habit = await res.json()
      setHabits(prev => [...prev, habit])
      setNewHabitName('')
      setNewHabitEmoji('✅')
      setNewHabitType('binary')
      setNewHabitUnit('')
      toast.success(`Added "${habit.name}"`)
    } else toast.error('Failed to add habit')
    setLoading(false)
  }

  async function deleteHabit(id: string) {
    if (!confirm('Delete this habit? All logged data for it will also be deleted.')) return
    const res = await fetch(`/api/habits/${id}`, { method: 'DELETE' })
    if (res.ok) { setHabits(prev => prev.filter(h => h.id !== id)); toast.success('Deleted') }
    else toast.error('Failed to delete')
  }

  async function saveHabitEdit(id: string) {
    if (!editingHabitName.trim()) return
    const res = await fetch(`/api/habits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingHabitName.trim(), emoji: editingHabitEmoji }),
    })
    if (res.ok) {
      const updated = await res.json()
      setHabits(prev => prev.map(h => h.id === id ? updated : h))
      setEditingHabitId(null)
      toast.success('Updated')
    } else toast.error('Failed to update')
  }

  // --- Projects ---
  async function addProject() {
    if (!newProjectName.trim()) return
    setLoading(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProjectName.trim(), emoji: newProjectEmoji, description: newProjectDesc || null }),
    })
    if (res.ok) {
      const proj = await res.json()
      setProjects(prev => [...prev, proj])
      setNewProjectName('')
      setNewProjectEmoji('📁')
      setNewProjectDesc('')
      toast.success(`Added "${proj.name}"`)
    } else toast.error('Failed to add project')
    setLoading(false)
  }

  async function saveProjectEdit(id: string) {
    if (!editingProjectName.trim()) return
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editingProjectName.trim(),
        emoji: editingProjectEmoji,
        description: editingProjectDesc || null,
        aliases: editingProjectAliases,
        status: editingProjectStatus,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProjects(prev => prev.map(p => p.id === id ? updated : p))
      setEditingProjectId(null)
      toast.success('Updated')
    } else toast.error('Failed to update')
  }

  // --- Tags ---
  async function addTag() {
    if (!newTagName.trim()) return
    setLoading(true)
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim() }),
    })
    if (res.ok) {
      const tag = await res.json()
      setTags(prev => [...prev, tag])
      setNewTagName('')
      toast.success(`Added "${tag.name}"`)
    } else toast.error('Failed to add tag')
    setLoading(false)
  }

  async function deleteTag(id: string) {
    const res = await fetch(`/api/tags?id=${id}`, { method: 'DELETE' })
    if (res.ok) { setTags(prev => prev.filter(t => t.id !== id)); toast.success('Deleted') }
    else toast.error('Failed to delete')
  }

  async function saveTagRename(id: string) {
    if (!editingTagName.trim()) return
    const res = await fetch(`/api/tags?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingTagName.trim() }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTags(prev => prev.map(t => t.id === id ? updated : t))
      setEditingTagId(null)
      toast.success('Updated')
    } else toast.error('Failed to update')
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const topLevel = categories.filter(c => !c.parent_id)

  function trackTypeLabel(h: Habit) {
    if (h.track_type === 'binary') return 'Yes/No'
    if (h.track_type === 'three_level') return 'High/Low'
    if (h.track_type === 'text') return 'Free text'
    return h.unit || 'numeric'
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center gap-3 px-4 h-12 border-b shrink-0">
        <Link href="/" className="text-muted-foreground hover:text-foreground -ml-2 p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-10">

          {/* Projects */}
          <section className="space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Projects</h2>
            <div className="space-y-1">
              {projects.map((proj) => (
                editingProjectId === proj.id ? (
                  <div key={proj.id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex gap-2">
                      <Input value={editingProjectEmoji} onChange={e => setEditingProjectEmoji(e.target.value)} className="w-16 text-center" maxLength={2} />
                      <Input value={editingProjectName} onChange={e => setEditingProjectName(e.target.value)} placeholder="Project name" className="flex-1" autoFocus />
                    </div>
                    <Input value={editingProjectDesc} onChange={e => setEditingProjectDesc(e.target.value)} placeholder="Description (optional)" />
                    <Input value={editingProjectAliases} onChange={e => setEditingProjectAliases(e.target.value)} placeholder="Aliases (comma-separated)" />
                    <div className="flex gap-2 items-center">
                      <select value={editingProjectStatus} onChange={e => setEditingProjectStatus(e.target.value as 'active' | 'paused' | 'done')}
                        className="text-sm border rounded-md px-3 py-2 bg-background flex-1">
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="done">Done</option>
                      </select>
                      <Button size="sm" onClick={() => saveProjectEdit(proj.id)} disabled={!editingProjectName.trim()}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingProjectId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div key={proj.id} className={`flex items-start justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 ${proj.status !== 'active' ? 'opacity-60' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm">{proj.emoji} {proj.name}</span>
                      {proj.description && <p className="text-xs text-muted-foreground mt-0.5">{proj.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <Badge variant="secondary" className="text-xs">{proj.status}</Badge>
                      <button
                        onClick={() => {
                          setEditingProjectId(proj.id)
                          setEditingProjectName(proj.name)
                          setEditingProjectEmoji(proj.emoji)
                          setEditingProjectDesc(proj.description || '')
                          setEditingProjectAliases(proj.aliases || '')
                          setEditingProjectStatus(proj.status)
                        }}
                        className="text-muted-foreground hover:text-foreground p-1">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Add project</p>
              <div className="flex gap-2">
                <Input value={newProjectEmoji} onChange={e => setNewProjectEmoji(e.target.value)} className="w-16 text-center" maxLength={2} />
                <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project name" className="flex-1" />
              </div>
              <Input value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} placeholder="Description (optional)" />
              <Button onClick={addProject} disabled={!newProjectName.trim() || loading} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </section>

          {/* Tags */}
          <section className="space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                editingTagId === tag.id ? (
                  <div key={tag.id} className="inline-flex items-center gap-1">
                    <Input value={editingTagName} onChange={e => setEditingTagName(e.target.value)}
                      className="h-7 text-sm px-2 py-0 w-28"
                      onKeyDown={e => { if (e.key === 'Enter') saveTagRename(tag.id); if (e.key === 'Escape') setEditingTagId(null) }}
                      autoFocus />
                    <button onClick={() => saveTagRename(tag.id)} className="text-emerald-600 hover:text-emerald-700 p-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingTagId(null)} className="text-muted-foreground hover:text-foreground p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span key={tag.id} className="inline-flex items-center gap-1 text-sm bg-muted px-2.5 py-1 rounded-full">
                    <button onClick={() => { setEditingTagId(tag.id); setEditingTagName(tag.name) }} className="hover:underline">
                      {tag.name}
                    </button>
                    <button onClick={() => deleteTag(tag.id)} className="text-muted-foreground hover:text-destructive ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )
              ))}
              {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet</p>}
            </div>
            <div className="flex gap-2">
              <Input value={newTagName} onChange={e => setNewTagName(e.target.value)}
                placeholder="e.g. leo, travel, life lesson" className="flex-1"
                onKeyDown={e => e.key === 'Enter' && addTag()} />
              <Button onClick={addTag} disabled={!newTagName.trim() || loading} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </section>

          {/* Habits */}
          <section className="space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Habits</h2>
            <div className="space-y-1">
              {habits.map((habit) => (
                editingHabitId === habit.id ? (
                  <div key={habit.id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex gap-2">
                      <Input value={editingHabitEmoji} onChange={e => setEditingHabitEmoji(e.target.value)} className="w-16 text-center" maxLength={2} />
                      <Input value={editingHabitName} onChange={e => setEditingHabitName(e.target.value)} className="flex-1"
                        onKeyDown={e => e.key === 'Enter' && saveHabitEdit(habit.id)} autoFocus />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveHabitEdit(habit.id)} disabled={!editingHabitName.trim()}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingHabitId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div key={habit.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50">
                    <span className="text-sm">{habit.emoji} {habit.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground mr-1">{trackTypeLabel(habit)}</span>
                      <button onClick={() => { setEditingHabitId(habit.id); setEditingHabitName(habit.name); setEditingHabitEmoji(habit.emoji) }}
                        className="text-muted-foreground hover:text-foreground p-1">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteHabit(habit.id)} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Add habit</p>
              <div className="flex gap-2">
                <Input value={newHabitEmoji} onChange={e => setNewHabitEmoji(e.target.value)} className="w-16 text-center" maxLength={2} />
                <Input value={newHabitName} onChange={e => setNewHabitName(e.target.value)} placeholder="Habit name" className="flex-1" />
              </div>
              <div className="flex gap-2">
                <select value={newHabitType} onChange={e => setNewHabitType(e.target.value)} className="text-sm border rounded-md px-3 py-2 bg-background">
                  <option value="binary">Yes / No</option>
                  <option value="numeric">Numeric</option>
                  <option value="three_level">High / Low</option>
                  <option value="text">Free text</option>
                </select>
                {newHabitType === 'numeric' && (
                  <Input value={newHabitUnit} onChange={e => setNewHabitUnit(e.target.value)} placeholder="Unit (km, mins, hrs)" className="flex-1" />
                )}
                <Button onClick={addHabit} disabled={!newHabitName.trim() || loading} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </section>

          {/* Categories */}
          <section className="space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Categories</h2>
            <div className="space-y-1">
              {topLevel.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50">
                    <span className="text-sm">{cat.emoji} {cat.name}</span>
                    <button onClick={() => deleteCategory(cat.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {categories.filter(c => c.parent_id === cat.id).map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between py-2 px-3 pl-8 rounded-lg hover:bg-muted/50">
                      <span className="text-sm text-muted-foreground">{sub.emoji} {sub.name}</span>
                      <button onClick={() => deleteCategory(sub.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Add category</p>
              <div className="flex gap-2">
                <Input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} className="w-16 text-center" maxLength={2} placeholder="📌" />
                <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name" onKeyDown={e => e.key === 'Enter' && addCategory()} className="flex-1" />
              </div>
              <div className="flex gap-2 items-center">
                <select value={newCatParent} onChange={e => setNewCatParent(e.target.value)} className="flex-1 text-sm border rounded-md px-3 py-2 bg-background">
                  <option value="">Top-level category</option>
                  {topLevel.map((cat) => (<option key={cat.id} value={cat.id}>Sub of: {cat.emoji} {cat.name}</option>))}
                </select>
                <Button onClick={addCategory} disabled={!newCatName.trim() || loading} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </section>

          {/* Keyword Rules */}
          <section className="space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Keyword Rules</h2>
            <p className="text-sm text-muted-foreground">When a note contains a keyword, it&apos;s instantly categorised without AI.</p>
            <div className="space-y-1">
              {keywordRules.map((rule) => {
                const cat = categories.find(c => c.id === rule.category_id)
                return (
                  <div key={rule.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{rule.keyword}</code>
                      <span className="text-muted-foreground text-xs">→</span>
                      <Badge variant="secondary" className="text-xs">{cat?.emoji} {cat?.name ?? 'Unknown'}</Badge>
                    </div>
                    <button onClick={() => deleteKeywordRule(rule.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Add keyword rule</p>
              <div className="flex gap-2">
                <Input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="keyword" className="flex-1" onKeyDown={e => e.key === 'Enter' && addKeywordRule()} />
                <select value={newKeywordCat} onChange={e => setNewKeywordCat(e.target.value)} className="text-sm border rounded-md px-3 py-2 bg-background">
                  {topLevel.map((cat) => (<option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>))}
                </select>
                <Button onClick={addKeywordRule} disabled={!newKeyword.trim() || !newKeywordCat || loading} size="sm"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
          </section>

          {/* Account */}
          <section className="space-y-4 pb-6">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Account</h2>
            <Button variant="outline" onClick={signOut} className="w-full">Sign out</Button>
          </section>

        </div>
      </div>

      <BottomNav />
      <Toaster position="top-center" />
    </div>
  )
}
