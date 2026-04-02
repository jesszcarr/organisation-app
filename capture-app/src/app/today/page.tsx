'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Item, Category, Project, Habit, HabitLog } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/app/BottomNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Eye, EyeOff, X } from 'lucide-react'

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
  const [numericEdit, setNumericEdit] = useState<{ habitId: string; date: string; value: string } | null>(null)
  const [textEdit, setTextEdit] = useState<{ habitId: string; date: string; value: string } | null>(null)

  const [habitWeekRef, setHabitWeekRef] = useState(new Date())

  const dateStr = formatDate(currentDate)
  const isToday = formatDate(new Date()) === dateStr

  const habitWeekDates = getWeekDates(habitWeekRef)
  const habitWeekFrom = formatDate(habitWeekDates[0])
  const habitWeekTo = formatDate(habitWeekDates[6])
  const isCurrentHabitWeek = habitWeekFrom === formatDate(getWeekDates(new Date())[0])

  const displayDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', month: 'long', day: 'numeric' }).format(currentDate)

  // Load hidden habits on mount
  useEffect(() => { setHiddenHabits(getHiddenHabits()) }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      loadData()
    })
  }, [router, dateStr])

  useEffect(() => {
    fetch(`/api/habit-logs?from=${habitWeekFrom}&to=${habitWeekTo}`)
      .then(r => r.ok ? r.json() : [])
      .then(setHabitLogs)
  }, [habitWeekFrom, habitWeekTo])

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
    const [createdRes, completedRes, habitsRes] = await Promise.all([
      fetch(`/api/items?date=${dateStr}`),
      fetch(`/api/items?completed_date=${dateStr}`),
      fetch('/api/habits'),
    ])
    if (createdRes.ok) setCreatedItems(await createdRes.json())
    if (completedRes.ok) setCompletedItems(await completedRes.json())
    if (habitsRes.ok) setHabits(await habitsRes.json())
    setLoading(false)
  }

  function goHabitWeek(dir: number) {
    setHabitWeekRef(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + dir * 7)
      return d
    })
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

  async function logHabit(habitId: string, date: string, value: number | null, note?: string) {
    // Optimistic update
    if (value === null) {
      setHabitLogs(prev => prev.filter(l => !(l.habit_id === habitId && l.log_date === date)))
      await fetch(`/api/habit-logs?habit_id=${habitId}&log_date=${date}`, { method: 'DELETE' })
    } else {
      setHabitLogs(prev => {
        const existing = prev.find(l => l.habit_id === habitId && l.log_date === date)
        if (existing) return prev.map(l => l.habit_id === habitId && l.log_date === date ? { ...l, value, note: note ?? l.note } : l)
        return [...prev, { id: `temp-${habitId}-${date}`, habit_id: habitId, item_id: null, log_date: date, value, note: note ?? null, created_at: new Date().toISOString() }]
      })
      await fetch('/api/habit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId, log_date: date, value, note: note ?? null }),
      })
    }
  }

  function handleCellClick(habit: Habit, date: string) {
    const val = logLookup[habit.id]?.[date]
    if (habit.track_type === 'binary') {
      logHabit(habit.id, date, val !== undefined ? null : 1)
    } else if (habit.track_type === 'three_level') {
      const next = val === undefined ? 1 : val === 1 ? 2 : null
      logHabit(habit.id, date, next)
    } else if (habit.track_type === 'text') {
      const existingNote = habitLogs.find(l => l.habit_id === habit.id && l.log_date === date)?.note ?? ''
      setTextEdit({ habitId: habit.id, date, value: existingNote })
      setNumericEdit(null)
    } else {
      setNumericEdit({ habitId: habit.id, date, value: val !== undefined ? String(val) : '' })
      setTextEdit(null)
    }
  }

  async function submitNumeric() {
    if (!numericEdit) return
    const trimmed = numericEdit.value.trim()
    await logHabit(numericEdit.habitId, numericEdit.date, trimmed === '' || isNaN(parseFloat(trimmed)) ? null : parseFloat(trimmed))
    setNumericEdit(null)
  }

  async function submitText() {
    if (!textEdit) return
    const trimmed = textEdit.value.trim()
    await logHabit(textEdit.habitId, textEdit.date, trimmed === '' ? null : 1, trimmed || undefined)
    setTextEdit(null)
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
    const today = formatDate(new Date())
    const val = logLookup[habit.id]?.[today]
    if (val === undefined) return '—'
    if (habit.track_type === 'binary') return '✓'
    if (habit.track_type === 'three_level') return val === 2 ? '●●' : val === 1 ? '●' : '—'
    if (habit.track_type === 'text') {
      const note = habitLogs.find(l => l.habit_id === habit.id && l.log_date === today)?.note ?? ''
      return note ? (note.length > 14 ? note.slice(0, 13) + '…' : note) : '—'
    }
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isToday ? 'What you did today' : displayDate}
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={() => goDay(-1)} className="p-1 text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => goDay(1)} disabled={isToday} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

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

            {/* Numeric input panel */}
            {numericEdit && (() => {
              const habit = habits.find(h => h.id === numericEdit.habitId)
              const label = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(numericEdit.date + 'T12:00:00'))
              return (
                <div className="mb-3 p-3 rounded-lg border bg-muted/30 flex items-center gap-2">
                  <span className="text-sm flex-1 truncate">{habit?.emoji} {habit?.name} — {label}</span>
                  <Input type="number" value={numericEdit.value}
                    onChange={e => setNumericEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                    onKeyDown={e => { if (e.key === 'Enter') submitNumeric(); if (e.key === 'Escape') setNumericEdit(null) }}
                    placeholder={habit?.unit ?? 'value'} className="w-24 h-8 text-sm" autoFocus />
                  <Button size="sm" onClick={submitNumeric} className="h-8 px-3">Save</Button>
                  <button onClick={() => setNumericEdit(null)} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })()}

            {/* Text input panel */}
            {textEdit && (() => {
              const habit = habits.find(h => h.id === textEdit.habitId)
              const label = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(textEdit.date + 'T12:00:00'))
              return (
                <div className="mb-3 p-3 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{habit?.emoji} {habit?.name} — {label}</span>
                    <button onClick={() => setTextEdit(null)} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea value={textEdit.value}
                    onChange={e => setTextEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText() } if (e.key === 'Escape') setTextEdit(null) }}
                    placeholder="Add a note…" rows={2}
                    className="w-full text-sm border rounded-md px-3 py-2 bg-background resize-none outline-none focus:ring-1 focus:ring-ring" autoFocus />
                  <div className="flex gap-2 justify-end">
                    {logLookup[textEdit.habitId]?.[textEdit.date] !== undefined && (
                      <Button size="sm" variant="outline" onClick={() => { logHabit(textEdit.habitId, textEdit.date, null); setTextEdit(null) }} className="h-7 px-2 text-xs">Clear</Button>
                    )}
                    <Button size="sm" onClick={submitText} className="h-7 px-3 text-xs">Save</Button>
                  </div>
                </div>
              )
            })()}

            {/* Day headers + week nav */}
            <div className="flex items-center mb-1">
              <div className="flex-1 flex items-center">
                <button onClick={() => goHabitWeek(-1)} className="p-0.5 text-muted-foreground hover:text-foreground shrink-0">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {!isCurrentHabitWeek && (
                  <span className="text-[10px] text-muted-foreground ml-0.5">
                    {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(habitWeekDates[0])}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {habitWeekDates.map((d, i) => (
                  <div key={i} className={`w-7 text-center text-[10px] ${formatDate(d) === formatDate(new Date()) ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {DAY_NAMES[i]}
                  </div>
                ))}
              </div>
              <div className="w-10 flex justify-end">
                <button onClick={() => goHabitWeek(1)} disabled={isCurrentHabitWeek} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 shrink-0">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Habit rows */}
            {visibleHabits.map((habit) => (
              <div key={habit.id} className="flex items-center py-1.5">
                <div className="flex-1 text-sm truncate">{habit.emoji} {habit.name}</div>
                <div className="flex gap-1">
                  {habitWeekDates.map((d, i) => {
                    const ds = formatDate(d)
                    const val = logLookup[habit.id]?.[ds]
                    const isDone = val !== undefined
                    const isCurrent = ds === formatDate(new Date())
                    const isThree = habit.track_type === 'three_level'

                    let cellClass: string
                    let cellContent: React.ReactNode

                    if (isThree) {
                      if (val === 2) {
                        cellClass = isCurrent
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-300 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100'
                        cellContent = '●●'
                      } else if (val === 1) {
                        cellClass = isCurrent
                          ? 'bg-emerald-300 text-emerald-900'
                          : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
                        cellContent = '●'
                      } else {
                        cellClass = isCurrent ? 'border-2 border-muted-foreground/30 bg-background' : 'bg-muted'
                        cellContent = ''
                      }
                    } else if (habit.track_type === 'text') {
                      cellClass = isDone
                        ? isCurrent ? 'bg-violet-500 text-white' : 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300'
                        : isCurrent ? 'border-2 border-muted-foreground/30 bg-background' : 'bg-muted'
                      cellContent = isDone ? '✎' : ''
                    } else {
                      cellClass = isDone
                        ? isCurrent ? 'bg-emerald-500 text-white' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                        : isCurrent ? 'border-2 border-muted-foreground/30 bg-background' : 'bg-muted'
                      cellContent = isDone && habit.track_type === 'binary' ? '✓' : isDone && val !== undefined ? Math.round(val) : ''
                    }

                    return (
                      <button key={i} onClick={() => handleCellClick(habit, ds)}
                        className={`w-7 h-7 rounded-sm flex items-center justify-center text-[10px] cursor-pointer hover:opacity-75 active:opacity-50 transition-opacity ${cellClass}`}>
                        {cellContent}
                      </button>
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
