-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- Users table (Supabase Auth handles auth.users, this is for profile data)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Folders table
create table if not exists public.folders (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid references public.users(id) on delete cascade not null,
  parent_id uuid references public.folders(id) on delete set null,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique constraint: prevent duplicate folder names at same level
create unique index if not exists folders_unique_name 
on public.folders(owner_id, parent_id, name) 
where is_deleted = false;

-- Indexes for folders
create index if not exists folders_owner_id_idx on public.folders(owner_id);
create index if not exists folders_parent_id_idx on public.folders(parent_id);
create index if not exists folders_name_idx on public.folders(name);

-- Files table
create table if not exists public.files (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  mime_type text,
  size_bytes bigint,
  storage_key text unique not null,
  owner_id uuid references public.users(id) on delete cascade not null,
  folder_id uuid references public.folders(id) on delete set null,
  version_id uuid, -- references file_versions(id), set after first version
  checksum text,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for files
create index if not exists files_owner_id_idx on public.files(owner_id);
create index if not exists files_folder_id_idx on public.files(folder_id);
create index if not exists files_name_idx on public.files(name);
create index if not exists files_mime_type_idx on public.files(mime_type);
-- Full-text search index
create index if not exists files_name_gin_idx on public.files using gin (name gin_trgm_ops);

-- File versions table
create table if not exists public.file_versions (
  id uuid primary key default uuid_generate_v4(),
  file_id uuid references public.files(id) on delete cascade not null,
  version_number int not null,
  storage_key text not null,
  size_bytes bigint,
  checksum text,
  created_at timestamptz default now(),
  unique(file_id, version_number)
);

create index if not exists file_versions_file_id_idx on public.file_versions(file_id);

-- Shares table (per-user ACL)
create table if not exists public.shares (
  id uuid primary key default uuid_generate_v4(),
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  grantee_user_id uuid references public.users(id) on delete cascade not null,
  role text not null check (role in ('viewer','editor')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now(),
  unique(resource_type, resource_id, grantee_user_id)
);

create index if not exists shares_resource_idx on public.shares(resource_type, resource_id);
create index if not exists shares_grantee_idx on public.shares(grantee_user_id);

-- Link shares table (public links)
create table if not exists public.link_shares (
  id uuid primary key default uuid_generate_v4(),
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  token text not null unique,
  role text not null default 'viewer' check (role = 'viewer'),
  password_hash text,
  expires_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists link_shares_token_idx on public.link_shares(token);
create index if not exists link_shares_resource_idx on public.link_shares(resource_type, resource_id);

-- Stars table
create table if not exists public.stars (
  user_id uuid references public.users(id) on delete cascade not null,
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  created_at timestamptz default now(),
  primary key (user_id, resource_type, resource_id)
);

create index if not exists stars_user_id_idx on public.stars(user_id);

-- Activities table
create table if not exists public.activities (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null check (action in ('upload','rename','delete','restore','move','share','download')),
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  context jsonb,
  created_at timestamptz default now()
);

create index if not exists activities_actor_idx on public.activities(actor_id);
create index if not exists activities_resource_idx on public.activities(resource_type, resource_id);
create index if not exists activities_created_at_idx on public.activities(created_at desc);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_folders_updated_at before update on public.folders
  for each row execute function update_updated_at_column();

create trigger update_files_updated_at before update on public.files
  for each row execute function update_updated_at_column();

-- Row Level Security (RLS) Policies
alter table public.users enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.shares enable row level security;
alter table public.link_shares enable row level security;
alter table public.stars enable row level security;
alter table public.activities enable row level security;

-- Users policies
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Folders policies (basic - extend as needed)
create policy "Users can view own folders"
  on public.folders for select
  using (auth.uid() = owner_id or is_deleted = false);

-- Files policies (basic - extend as needed)
create policy "Users can view own files"
  on public.files for select
  using (auth.uid() = owner_id or is_deleted = false);

-- Note: RLS policies should be more comprehensive to include share access
-- This is a basic structure - extend based on your access control logic
