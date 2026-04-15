-- Add exercise_tags column to habits table (stores array of exercise names)
alter table habits add column if not exists exercise_tags text[] not null default '{}';
