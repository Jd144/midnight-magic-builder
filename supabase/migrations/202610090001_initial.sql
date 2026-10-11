-- Apply once in Supabase SQL editor, or with supabase db push.
create table public.sites (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 draft jsonb not null check (jsonb_typeof(draft) = 'object'),
 slug text unique,
 updated_at timestamptz not null default now()
);
create index sites_owner_idx on public.sites(owner_id);
alter table public.sites enable row level security;
create policy "Owners manage their drafts" on public.sites for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create table public.published_sites (
 site_id uuid primary key references public.sites(id) on delete cascade,
 slug text unique not null,
 snapshot jsonb not null,
 published_at timestamptz not null default now()
);
alter table public.published_sites enable row level security;
create policy "Read published snapshots" on public.published_sites for select to anon,authenticated using (true);
-- No direct writes to snapshots. Only this function can copy an owned draft.
create function public.publish_site(site_id uuid) returns text language plpgsql security definer set search_path = '' as $$
declare source public.sites; result text; clean jsonb;
begin
 select * into source from public.sites where id = site_id and owner_id = auth.uid() for update;
 if source.id is null then raise exception 'Site not found or access denied'; end if;
 -- Reject references to another owner's files, even if a client forged its JSON.
 if exists(select 1 from jsonb_array_elements(source.draft->'chapters') c cross join lateral jsonb_array_elements(c->'media') m where m ? 'path' and (split_part(m->>'path','/',1) <> auth.uid()::text or split_part(m->>'path','/',2) <> source.id::text)) then raise exception 'Invalid media ownership'; end if;
 if source.draft ? 'musicPath' and (split_part(source.draft->>'musicPath','/',1) <> auth.uid()::text or split_part(source.draft->>'musicPath','/',2) <> source.id::text) then raise exception 'Invalid music ownership'; end if;
 -- Hidden chapters and their private media never enter the public snapshot.
 clean := jsonb_set(source.draft,'{chapters}',coalesce((select jsonb_agg(c) from jsonb_array_elements(source.draft->'chapters') c where coalesce((c->>'hidden')::boolean,false)=false),'[]'::jsonb));
 result := coalesce(source.slug,replace(gen_random_uuid()::text,'-',''));
 update public.sites set slug=result where id=source.id;
 insert into public.published_sites(site_id,slug,snapshot) values(source.id,result,clean)
 on conflict on constraint published_sites_pkey do update set snapshot=excluded.snapshot,published_at=now();
 return result;
end $$;
create function public.unpublish_site(site_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.sites where id=site_id and owner_id=auth.uid()) then raise exception 'Site not found or access denied'; end if;
 delete from public.published_sites where published_sites.site_id=unpublish_site.site_id;
end $$;
revoke all on function public.publish_site(uuid),public.unpublish_site(uuid) from public,anon;
grant execute on function public.publish_site(uuid),public.unpublish_site(uuid) to authenticated;
grant select,insert,update,delete on public.sites to authenticated;
grant select on public.published_sites to anon,authenticated;
revoke insert,update,delete on public.published_sites from anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('birthday-media','birthday-media',false,104857600,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/mpeg','audio/ogg','audio/wav']);
create function public.owns_media_path(path text) returns boolean language sql stable security definer set search_path='' as $$
 select split_part(path,'/',1)=auth.uid()::text and exists(select 1 from public.sites s where s.id::text=split_part(path,'/',2) and s.owner_id=auth.uid());
$$;
create function public.published_media_path(path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.published_sites p where exists(select 1 from jsonb_array_elements(p.snapshot->'chapters') c cross join lateral jsonb_array_elements(c->'media') m where m->>'path'=path) or p.snapshot->>'musicPath'=path);
$$;
create policy "Owners upload media" on storage.objects for insert to authenticated with check(bucket_id='birthday-media' and public.owns_media_path(name));
create policy "Owners delete unused media" on storage.objects for delete to authenticated using(bucket_id='birthday-media' and public.owns_media_path(name) and not public.published_media_path(name));
create policy "Read owned or explicitly published media" on storage.objects for select to anon,authenticated using(bucket_id='birthday-media' and (public.owns_media_path(name) or public.published_media_path(name)));
-- No update policy: unique object paths preserve existing snapshots.
