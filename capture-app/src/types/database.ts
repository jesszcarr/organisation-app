export interface Category {
  id: string
  user_id: string
  name: string
  emoji: string
  parent_id: string | null
  sort_order: number
  created_at: string
}

export interface Item {
  id: string
  user_id: string
  content: string
  category_id: string
  created_at: string
  categorized_by: 'keyword' | 'ai' | 'manual'
  // joined from categories
  category?: Category
}

export interface KeywordRule {
  id: string
  user_id: string
  keyword: string
  category_id: string
}

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Omit<Category, 'id' | 'user_id' | 'created_at'>>
      }
      items: {
        Row: Item
        Insert: Omit<Item, 'id' | 'created_at' | 'category'>
        Update: Partial<Omit<Item, 'id' | 'user_id' | 'created_at' | 'category'>>
      }
      keyword_rules: {
        Row: KeywordRule
        Insert: Omit<KeywordRule, 'id'>
        Update: Partial<Omit<KeywordRule, 'id' | 'user_id'>>
      }
    }
  }
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
]
