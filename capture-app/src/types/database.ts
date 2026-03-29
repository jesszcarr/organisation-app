export interface Category {
  id: string
  user_id: string
  name: string
  emoji: string
  parent_id: string | null
  sort_order: number
  created_at: string
}

export type ItemType = 'task' | 'reflection' | 'achievement' | 'project_update' | 'link' | 'habit_entry'

export interface Item {
  id: string
  user_id: string
  content: string
  type: ItemType
  category_id: string | null
  project_id: string | null
  pending_habit_id: string | null
  completed_at: string | null
  created_at: string
  categorized_by: 'keyword' | 'ai' | 'manual'
  category?: Category
  project?: Project
  pending_habit?: Habit
  tags?: Tag[]
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  emoji: string
  status: 'active' | 'paused' | 'done'
  aliases: string
  created_at: string
  updated_at: string
}

export type LinkType = 'chat' | 'document' | 'repo' | 'other'

export interface ProjectLink {
  id: string
  project_id: string
  url: string
  title: string
  link_type: LinkType
  created_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface ItemTag {
  item_id: string
  tag_id: string
}

export type TrackType = 'binary' | 'numeric' | 'three_level'

export interface Habit {
  id: string
  user_id: string
  name: string
  emoji: string
  track_type: TrackType
  unit: string | null
  active: boolean
  sort_order: number
  exercise_tags: string[]
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  item_id: string | null
  log_date: string
  value: number
  note: string | null
  created_at: string
}

export interface KeywordRule {
  id: string
  user_id: string
  keyword: string
  category_id: string
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id' | 'created_at'>[] = [
  { name: 'Groceries', emoji: '🛒', parent_id: null, sort_order: 0 },
  { name: 'Watch', emoji: '📺', parent_id: null, sort_order: 1 },
  { name: 'Read', emoji: '📚', parent_id: null, sort_order: 2 },
  { name: 'Listen', emoji: '🎵', parent_id: null, sort_order: 3 },
  { name: 'Todo', emoji: '✅', parent_id: null, sort_order: 4 },
  { name: 'Video Game', emoji: '🎮', parent_id: null, sort_order: 5 },
  { name: 'Workouts', emoji: '💪', parent_id: null, sort_order: 6 },
  { name: 'Piano Practice', emoji: '🎹', parent_id: null, sort_order: 7 },
  { name: 'DiscoverAI', emoji: '🤖', parent_id: null, sort_order: 8 },
  { name: 'Reflection', emoji: '💭', parent_id: null, sort_order: 9 },
]

export const DEFAULT_HABITS: Omit<Habit, 'id' | 'user_id' | 'created_at'>[] = [
  { name: 'Cardio', emoji: '🏃', track_type: 'numeric', unit: 'km', active: true, sort_order: 0, exercise_tags: [] },
  { name: 'Strength Training', emoji: '💪', track_type: 'binary', unit: null, active: true, sort_order: 1, exercise_tags: ['Bench press', 'Deadlift', 'Squat', 'Pull-up', 'Row', 'Shoulder press', 'Bicep curl', 'Tricep extension'] },
  { name: 'Stretching', emoji: '🧘', track_type: 'binary', unit: null, active: true, sort_order: 2, exercise_tags: [] },
  { name: 'graphfm', emoji: '📊', track_type: 'three_level', unit: null, active: true, sort_order: 3, exercise_tags: [] },
  { name: 'Dev interp', emoji: '📖', track_type: 'three_level', unit: null, active: true, sort_order: 4, exercise_tags: [] },
  { name: 'FLAIR/quant', emoji: '📈', track_type: 'three_level', unit: null, active: true, sort_order: 5, exercise_tags: [] },
]

export const DEFAULT_PROJECTS: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { name: 'graphfm', description: 'Graph foundation models for social networks — with Seth, Daniel', emoji: '📊', status: 'active', aliases: 'GF, graphs, graph foundation, seth, daniel, graphpfn' },
  { name: 'Dev interp', description: 'Developmental interpretability — Fourier features & grokking — with Quentin, Leo', emoji: '📖', status: 'active', aliases: 'DI, dev interp, developmental interpretability, grokking, fourier, leo, quentin, marek, lauren, jace' },
  { name: 'FLAIR/quant', description: 'SSM/GDN for LOB — with Jakob, Kang', emoji: '📈', status: 'active', aliases: 'FQ, flair, quant, LOB, limit order book, SSM, GDN, jakob, kang' },
]
