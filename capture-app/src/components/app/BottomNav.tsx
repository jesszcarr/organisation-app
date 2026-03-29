'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, FolderOpen, CalendarDays, CheckSquare, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', icon: MessageSquare, label: 'Capture' },
  { href: '/todos', icon: CheckSquare, label: 'To-dos' },
  { href: '/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/today', icon: CalendarDays, label: 'Today' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center justify-around border-t bg-background h-14 shrink-0 safe-area-bottom">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link key={href} href={href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
