-- Preserve private content attached to hidden cartoon/surprise chapters.
create or replace function public.publish_site(site_id uuid) returns text language plpgsql security definer set search_path = '' as $$
declare source public.sites; result text; clean jsonb;
begin
 select * into source from public.sites where id = site_id and owner_id = auth.uid() for update;
 if source.id is null then raise exception 'Site not found or access denied'; end if;
 -- Reject references to another owner's files, even if a client forged its JSON.
 if exists(select 1 from jsonb_array_elements(source.draft->'chapters') c cross join lateral jsonb_array_elements(c->'media') m where m ? 'path' and (split_part(m->>'path','/',1) <> auth.uid()::text or split_part(m->>'path','/',2) <> source.id::text)) then raise exception 'Invalid media ownership'; end if;
 if source.draft ? 'musicPath' and (split_part(source.draft->>'musicPath','/',1) <> auth.uid()::text or split_part(source.draft->>'musicPath','/',2) <> source.id::text) then raise exception 'Invalid music ownership'; end if;
 -- Hidden chapters and their private media never enter the public snapshot.
 clean := jsonb_set(source.draft,'{chapters}',coalesce((select jsonb_agg(c) from jsonb_array_elements(source.draft->'chapters') c where coalesce((c->>'hidden')::boolean,false)=false),'[]'::jsonb));
 if not exists(select 1 from jsonb_array_elements(clean->'chapters') c where c->>'id'='4') then clean := clean - 'comicScenes' - 'storyCharacters'; end if;
 if not exists(select 1 from jsonb_array_elements(clean->'chapters') c where c->>'id'='10') then clean := clean - 'metAt'; end if;
 result := coalesce(source.slug,replace(gen_random_uuid()::text,'-',''));
 update public.sites set slug=result where id=source.id;
 insert into public.published_sites(site_id,slug,snapshot) values(source.id,result,clean)
 on conflict on constraint published_sites_pkey do update set snapshot=excluded.snapshot,published_at=now();
 return result;
end $$;
