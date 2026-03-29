'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Project } from '../../../src/types/database'
import { createClient } from '../../../src/lib/supabase/client'
import { BottomNav } from '../../../src/components/app/BottomNav'
import { ChevronRight } from 'lucide-react'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      fetch('/api/projects').then(r => r.ok ? r.json() : []).then(setProjects)
    })
  }, [router])

  const active = projects.filter(p => p.status === 'active')
  const other = projects.filter(p => p.status !== 'active')

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center px-4 h-12 border-b shrink-0">
        <h1 className="font-semibold text-base">📁 Projects</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {active.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Active</h2>
              <div className="space-y-1">
                {active.map(project => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{project.emoji}</span>
                        <span className="font-medium text-sm">{project.name}</span>
                      </div>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate pl-7">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {other.length > 0 && (
            <section>
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Archived</h2>
              <div className="space-y-1">
                {other.map(project => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors opacity-60"
                  >
                    <div className="flex items-center gap-2">
                      <span>{project.emoji}</span>
                      <span className="text-sm">{project.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {projects.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-sm">No projects yet</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
