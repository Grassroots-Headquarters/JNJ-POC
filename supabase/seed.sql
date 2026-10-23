-- Local and CI seed data. Runs after migrations on `supabase db reset`.
insert into public.platform_status (id, message)
values (1, 'connected')
on conflict (id) do update set message = excluded.message;
