-- Categories
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

-- Items
create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  category_id uuid references categories(id) on delete set null,
  created_at timestamptz default now() not null,
  categorized_by text not null default 'manual' check (categorized_by in ('keyword', 'ai', 'manual'))
);

alter table items enable row level security;
create policy "Users see own items" on items for all using (auth.uid() = user_id);

-- Keyword rules
create table keyword_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  keyword text not null,
  category_id uuid references categories(id) on delete cascade not null
);

alter table keyword_rules enable row level security;
create policy "Users see own keyword rules" on keyword_rules for all using (auth.uid() = user_id);

-- Index for fast item lookups
create index items_user_id_created_at on items(user_id, created_at desc);
create index items_category_id on items(category_id);
