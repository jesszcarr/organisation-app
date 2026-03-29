'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Project, ProjectLink, Item, Category } from '../../../../src/types/database'
import { createClient } from '../../../../src/lib/supabase/client'
import { ChatInput } from '../../../../src/components/app/ChatInput'
import { BottomNav } from '../../../../src/components/app/BottomNav'
import { Toaster } from '../../../../src/components/ui/sonner'
import { toast } from 'sonner'
import { ArrowLeft, Plus, ExternalLink, Trash2, MessageCircle, Link2, FileText, GitBranch } from 'lucide-react'

const LINK_ICONS: Record<string, typeof MessageCircle> = {
  chat: MessageCircle,
  document: FileText,
  repo: GitBranch,
  other: Link2,
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [links, setLinks] = useState<ProjectLink[]>([])
  const [items, setItems] = useState<(Item & { category?: Category })[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showAddLink, setShowAddLink] = useState(false)
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkType, setNewLinkType] = useState<string>('other')
  const [projectId, setProjectId] = useState<string>('')

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id)
    })
  }, [params])

  const loadProject = useCallback(async () => {
    if (!projectId) return
    const res = await fetch(`/api/projects/${projectId}`)
    if (res.ok) {
      const data = await res.json()
      setProject(data)
      setLinks(data.links ?? [])
      setItems(data.items ?? [])
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      loadProject()
    })
  }, [projectId, router, loadProject])

  async function handleSubmit(message: string) {
    setSubmitting(true)
    try {
      // Save directly as project_update
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          type: 'project_update',
          project_id: projectId,
          categorized_by: 'manual',
        }),
      })
      if (res.ok) {
        const saved = await res.json()
        setItems((prev) => [saved, ...prev])
      } else {
        toast.error('Failed to save')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddLink() {
    if (!newLinkUrl.trim()) return
    const res = await fetch(`/api/projects/${projectId}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: newLinkUrl.trim(),
        title: newLinkTitle.trim() || newLinkUrl.trim(),
        link_type: newLinkType,
      }),
    })
    if (res.ok) {
      const link = await res.json()
      setLinks((prev) => [link, ...prev])
      setNewLinkUrl('')
      setNewLinkTitle('')
      setShowAddLink(false)
      toast.success('Link added')
    } else {
      toast.error('Failed to add link')
    }
  }

  async function handleDeleteLink(linkId: string) {
    const res = await fetch(`/api/projects/${projectId}/links?link_id=${linkId}`, { method: 'DELETE' })
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
    }
  }

  if (!project) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
        <BottomNav />
      </div>
    )
  }

  const formattedDate = (dateStr: string) =>
    new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateStr))

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center gap-3 px-4 h-12 border-b shrink-0">
        <Link href="/projects" className="text-muted-foreground hover:text-foreground -ml-2 p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-base">{project.emoji} {project.name}</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Project info */}
          <div className="px-4 py-3 border-b">
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 ${
              project.status === 'active'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                : 'bg-muted text-muted-foreground'
            }`}>
              {project.status}
            </span>
          </div>

          {/* Pinned links */}
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pinned links</h2>
              <button
                onClick={() => setShowAddLink(!showAddLink)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showAddLink && (
              <div className="rounded-lg border p-3 mb-3 space-y-2">
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="URL (e.g. claude.ai/chat/...)"
                  className="w-full text-sm border rounded-md px-3 py-1.5 bg-background"
                />
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full text-sm border rounded-md px-3 py-1.5 bg-background"
                />
                <div className="flex gap-2">
                  <select
                    value={newLinkType}
                    onChange={(e) => setNewLinkType(e.target.value)}
                    className="text-sm border rounded-md px-2 py-1.5 bg-background"
                  >
                    <option value="chat">Chat</option>
                    <option value="document">Document</option>
                    <option value="repo">Repo</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    onClick={handleAddLink}
                    className="text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {links.length === 0 && !showAddLink && (
              <p className="text-sm text-muted-foreground">No links yet</p>
            )}

            <div className="space-y-1">
              {links.map((link) => {
                const Icon = LINK_ICONS[link.link_type] || Link2
                return (
                  <div key={link.id} className="flex items-center justify-between group">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline min-w-0 flex-1"
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{link.title || link.url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                    </a>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Updates timeline */}
          <div className="px-4 py-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Updates</h2>
            <div className="space-y-3">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No updates yet — type below to add one</p>
              )}
              {items.map((item) => (
                <div key={item.id} className="flex flex-col items-end gap-1">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 shadow-sm">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {item.content}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground px-1">
                    {formattedDate(item.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ChatInput
        onSubmit={handleSubmit}
        disabled={submitting}
        placeholder={`Update ${project.name}…`}
      />
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  )
}
