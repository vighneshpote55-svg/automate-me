create table if not exists public.website_leads (
  id uuid primary key,
  name text not null,
  phone text not null,
  email text,
  college text,
  course text,
  branch text,
  project_type text,
  domain text,
  deadline text,
  message text,
  source text,
  consent boolean default false,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_page text,
  referrer text,
  status text default 'new',
  created_at timestamptz default now()
);

alter table public.website_leads add column if not exists course text;
alter table public.website_leads add column if not exists branch text;
alter table public.website_leads add column if not exists deadline text;

create index if not exists website_leads_created_at_idx on public.website_leads (created_at desc);
create index if not exists website_leads_status_idx on public.website_leads (status);
