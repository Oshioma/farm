-- Build Design Tasks table
-- Used by super admin to manage build/construction tasks (electricity, plumbing, etc.)
create table if not exists build_design_tasks (
  id uuid default gen_random_uuid() primary key,
  category text not null default 'electricity',
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  assigned_to text,  -- stores user email
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
