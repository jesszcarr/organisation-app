-- ============================================================
-- Migration 001: Full schema — categories, items, projects,
-- habits, tags, search, vectors
-- ============================================================

-- ------------------------------------------------------------
-- 1. Categories
-- ------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  emoji text not null default '📌',
  parent_id uuid references categories(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz default now() not null
);

alter table categories enable row level security;
create policy "Users see own categories" on categories for all using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. Projects
-- ------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  emoji text not null default '📁',
  status text not null default 'active' check (status in ('active', 'paused', 'done')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table projects enable row level security;
create policy "Users see own projects" on projects for all using (auth.uid() = user_id);

create index projects_user_id on projects(user_id);

-- ------------------------------------------------------------
-- 3. Project links (claude chat links, repos, docs)
-- ------------------------------------------------------------
create table project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  url text not null,
  title text not null default '',
  link_type text not null default 'other' check (link_type in ('chat', 'document', 'repo', 'other')),
  created_at timestamptz default now() not null
);

alter table project_links enable row level security;
create policy "Users see own project links" on project_links for all
  using (project_id in (select id from projects where user_id = auth.uid()));

create index project_links_project_id on project_links(project_id);

-- ------------------------------------------------------------
-- 4. Items (the core capture table)
-- ------------------------------------------------------------
create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  type text not null default 'task'
    check (type in ('task', 'reflection', 'achievement', 'project_update', 'link', 'habit_entry')),
  category_id uuid references categories(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz default now() not null,
  categorized_by text not null default 'manual'
    check (categorized_by in ('keyword', 'ai', 'manual'))
);

alter table items enable row level security;
create policy "Users see own items" on items for all using (auth.uid() = user_id);

create index items_user_id_created_at on items(user_id, created_at desc);
create index items_category_id on items(category_id);
create index items_project_id on items(project_id);
create index items_type on items(type);

-- ------------------------------------------------------------
-- 5. Keyword rules (instant categorisation without AI)
-- ------------------------------------------------------------
create table keyword_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  keyword text not null,
  category_id uuid references categories(id) on delete cascade not null
);

alter table keyword_rules enable row level security;
create policy "Users see own keyword rules" on keyword_rules for all using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. Tags (freeform labels, many-to-many with items)
-- ------------------------------------------------------------
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  unique(user_id, name)
);

alter table tags enable row level security;
create policy "Users see own tags" on tags for all using (auth.uid() = user_id);

create table item_tags (
  item_id uuid references items(id) on delete cascade not null,
  tag_id uuid references tags(id) on delete cascade not null,
  primary key (item_id, tag_id)
);

alter table item_tags enable row level security;
create policy "Users see own item tags" on item_tags for all
  using (item_id in (select id from items where user_id = auth.uid()));

-- ------------------------------------------------------------
-- 7. Habits
-- ------------------------------------------------------------
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  emoji text not null default '✅',
  track_type text not null default 'binary' check (track_type in ('binary', 'numeric')),
  unit text, -- km, mins, hours, etc. null for binary
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now() not null
);

alter table habits enable row level security;
create policy "Users see own habits" on habits for all using (auth.uid() = user_id);

create index habits_user_id on habits(user_id);

-- ------------------------------------------------------------
-- 8. Habit logs
-- ------------------------------------------------------------
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade not null,
  item_id uuid references items(id) on delete set null,
  log_date date not null default current_date,
  value real not null default 1,
  note text,
  created_at timestamptz default now() not null,
  unique(habit_id, log_date)
);

alter table habit_logs enable row level security;
create policy "Users see own habit logs" on habit_logs for all
  using (habit_id in (select id from habits where user_id = auth.uid()));

create index habit_logs_habit_date on habit_logs(habit_id, log_date desc);
create index habit_logs_item_id on habit_logs(item_id);

-- ------------------------------------------------------------
-- 9. Full-text search on items (free, automatic)
-- ------------------------------------------------------------
alter table items add column fts tsvector
  generated always as (to_tsvector('english', content)) stored;

create index items_fts on items using gin(fts);

create or replace function search_items(query text, p_user_id uuid default auth.uid())
returns setof items
language sql stable
as $$
  select * from items
  where user_id = p_user_id
    and fts @@ plainto_tsquery('english', query)
  order by ts_rank(fts, plainto_tsquery('english', query)) desc,
           created_at desc
  limit 50;
$$;

-- ------------------------------------------------------------
-- 10. Vector column for semantic search (populated later)
-- ------------------------------------------------------------
create extension if not exists vector;

-- 1536 dims = OpenAI text-embedding-3-small
alter table items add column embedding vector(1536);

create index items_embedding on items using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function match_items(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 20,
  p_user_id uuid default auth.uid()
)
returns table (id uuid, content text, type text, category_id uuid, project_id uuid, created_at timestamptz, similarity float)
language sql stable
as $$
  select
    items.id,
    items.content,
    items.type,
    items.category_id,
    items.project_id,
    items.created_at,
    1 - (items.embedding <=> query_embedding) as similarity
  from items
  where items.user_id = p_user_id
    and items.embedding is not null
    and 1 - (items.embedding <=> query_embedding) > match_threshold
  order by items.embedding <=> query_embedding
  limit match_count;
$$;

-- ------------------------------------------------------------
-- 11. Auto-update updated_at on projects
-- ------------------------------------------------------------
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();