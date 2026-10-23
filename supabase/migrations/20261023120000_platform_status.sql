-- platform_status: one row both apps read to prove they reach the database.
create extension if not exists pgtap with schema extensions;

create table public.platform_status (
  id int primary key,
  message text not null
);

alter table public.platform_status enable row level security;

create policy "platform_status is readable by everyone"
  on public.platform_status
  for select
  to anon, authenticated
  using (true);
