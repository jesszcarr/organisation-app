'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Item, Category, Project, Habit, HabitLog } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/app/BottomNav'
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'

function formatDate(date: Date) { return date.toISOString().split('T')[0] }

function getWeekDates(ref: Date): Date[] {
  const day = ref.getDay()
  const mon = new Date(ref)
  mon.setDate(ref.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d })
}

const DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const TYPE_COLORS: Record<string, string> = {
  achievement: 'bg-emerald-400 dark:bg-emerald-600',
  project_update: 'bg-blue-400 dark:bg-blue-600',
  reflection: 'bg-amber-400 dark:bg-amber-600',
  habit_entry: 'bg-purple-400 dark:bg-purple-600',
  task: 'bg-gray-300 dark:bg-gray-600',
  link: 'bg-sky-400 dark:bg-sky-600',
}

// Load hidden habits from localStorage
function getHiddenHabits(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem('hidden_habits')
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch { return new Set() }
}

function saveHiddenHabits(hidden: Set<string>) {
  localStorage.setItem('hidden_habits', JSON.stringify([...hidden]))
}

export default function TodayPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [createdItems, setCreatedItems] = useState<(Item & { category?: Category; project?: Project })[]>([])
  const [completedItems, setCompletedItems] = useState<(Item & { category?: Category; project?: Project })[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [hiddenHabits, setHiddenHabits] = useState<Set<string>>(new Set())
  const [showHabitSettings, setShowHabitSettings] = useState(false)

  const dateStr = formatDate(currentDate)
  const weekDates = getWeekDates(currentDate)
  const weekFrom = formatDate(weekDates[0])
  const weekTo = formatDate(weekDates[6])
  const isToday = formatDate(new Date()) === dateStr

  const displayDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', month: 'long', day: 'numeric' }).format(currentDate)

  // Load hidden habits on mount
  useEffect(() => { setHiddenHabits(getHiddenHabits()) }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      loadData()
    })
  }, [router, dateStr, weekFrom, weekTo])

  // Refetch when switching back to this tab
  useEffect(() => {
    function refetch() {
      if (document.visibilityState === 'visible') loadData()
    }
    document.addEventListener('visibilitychange', refetch)
    return () => document.removeEventListener('visibilitychange', refetch)
  }, [loadData])

  async function loadData() {
    setLoading(true)
    const [createdRes, completedRes, habitsRes, logsRes] = await Promise.all([
      fetch(`/api/items?date=${dateStr}`),
      fetch(`/api/items?completed_date=${dateStr}`),
      fetch('/api/habits'),
      fetch(`/api/habit-logs?from=${weekFrom}&to=${weekTo}`),
    ])
    if (createdRes.ok) setCreatedItems(await createdRes.json())
    if (completedRes.ok) setCompletedItems(await completedRes.json())
    if (habitsRes.ok) setHabits(await habitsRes.json())
    if (logsRes.ok) setHabitLogs(await logsRes.json())
    setLoading(false)
  }

  function goDay(offset: number) {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + offset)
    if (next <= new Date()) setCurrentDate(next)
  }

  function toggleHabitVisibility(habitId: string) {
    setHiddenHabits(prev => {
      const next = new Set(prev)
      if (next.has(habitId)) next.delete(habitId)
      else next.add(habitId)
      saveHiddenHabits(next)
      return next
    })
  }

  // Merge created + completed, deduplicate
  const allMeaningful = (() => {
    const map = new Map<string, Item & { category?: Category; project?: Project }>()
    for (const item of createdItems) {
      if (item.type !== 'task' && item.type !== 'link') map.set(item.id, item)
    }
    for (const item of completedItems) map.set(item.id, item)
    return [...map.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  })()

  const tasksAndLinks = createdItems.filter(i => i.type === 'task' || i.type === 'link')

  const logLookup: Record<string, Record<string, number>> = {}
  for (const log of habitLogs) {
    if (!logLookup[log.habit_id]) logLookup[log.habit_id] = {}
    logLookup[log.habit_id][log.log_date] = log.value
  }

  function todayValue(habit: Habit): string {
    const val = logLookup[habit.id]?.[dateStr]
    if (val === undefined) return '—'
    if (habit.track_type === 'binary') return '✓'
    return `${val}${habit.unit ?? ''}`
  }

  const fmtTime = (d: string) => new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit' }).format(new Date(d))

  const visibleHabits = habits.filter(h => h.active && !hiddenHabits.has(h.id))

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-4 h-12 border-b shrink-0">
        <button onClick={() => goDay(-1)} className="p-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="font-semibold text-sm">{displayDate}</h1>
          {isToday && <span className="text-xs text-muted-foreground">Today</span>}
        </div>
        <button onClick={() => goDay(1)} disabled={isToday} className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">

          {/* What you did */}
          <section className="px-4 py-4 border-b">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              What you did{isToday ? ' today' : ''}
            </h2>

            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
            ) : allMeaningful.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isToday ? 'Nothing logged yet — type in Capture to add' : 'Nothing logged this day'}
              </p>
            ) : (
              <div className="space-y-3">
                {allMeaningful.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${TYPE_COLORS[item.type] || TYPE_COLORS.task}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed">
                        {item.completed_at && <span className="text-emerald-600 dark:text-emerald-400 mr-1">✓</span>}
                        {item.content}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {item.completed_at ? `Done ${fmtTime(item.completed_at)}` : fmtTime(item.created_at)}
                        </span>
                        {item.project && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">{item.project.emoji} {item.project.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tasksAndLinks.length > 0 && (
              <details className="mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  + {tasksAndLinks.length} tasks & links
                </summary>
                <div className="space-y-2 mt-2">
                  {tasksAndLinks.map((item) => (
                    <div key={item.id} className="flex gap-3 items-start">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${TYPE_COLORS[item.type]}`} />
                      <div>
                        <p className="text-sm text-muted-foreground">{item.content}</p>
                        <span className="text-xs text-muted-foreground">{fmtTime(item.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>

          {/* Habits */}
          <section className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Habits this week</h2>
              <button onClick={() => setShowHabitSettings(!showHabitSettings)}
                className="text-muted-foreground hover:text-foreground p-1">
                {showHabitSettings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Habit visibility toggles */}
            {showHabitSettings && (
              <div className="mb-3 p-3 rounded-lg border space-y-1">
                <p className="text-xs text-muted-foreground mb-2">Toggle which habits to show:</p>
                {habits.filter(h => h.active).map((habit) => (
                  <label key={habit.id} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input type="checkbox" checked={!hiddenHabits.has(habit.id)}
                      onChange={() => toggleHabitVisibility(habit.id)}
                      className="rounded" />
                    <span className="text-sm">{habit.emoji} {habit.name}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Day headers */}
            <div className="flex items-center mb-1">
              <div className="flex-1" />
              <div className="flex gap-1">
                {weekDates.map((d, i) => (
                  <div key={i} className={`w-7 text-center text-[10px] ${formatDate(d) === dateStr ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {DAY_NAMES[i]}
                  </div>
                ))}
              </div>
              <div className="w-10" />
            </div>

            {/* Habit rows */}
            {visibleHabits.map((habit) => (
              <div key={habit.id} className="flex items-center py-1.5">
                <div className="flex-1 text-sm truncate">{habit.emoji} {habit.name}</div>
                <div className="flex gap-1">
                  {weekDates.map((d, i) => {
                    const ds = formatDate(d)
                    const val = logLookup[habit.id]?.[ds]
                    const isDone = val !== undefined
                    const isCurrent = ds === dateStr
                    return (
                      <div key={i} className={`w-7 h-7 rounded-sm flex items-center justify-center text-[10px] ${
                        isDone
                          ? isCurrent ? 'bg-emerald-500 text-white' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                          : isCurrent ? 'border-2 border-muted-foreground/30 bg-background' : 'bg-muted'
                      }`}>
                        {isDone && habit.track_type === 'binary' ? '✓' : isDone ? Math.round(val) : ''}
                      </div>
                    )
                  })}
                </div>
                <div className="w-10 text-right text-xs text-muted-foreground">{todayValue(habit)}</div>
              </div>
            ))}

            {visibleHabits.length === 0 && !showHabitSettings && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {habits.length === 0 ? 'No habits set up yet' : 'All habits hidden — tap the eye icon to show some'}
              </p>
            )}
          </section>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
