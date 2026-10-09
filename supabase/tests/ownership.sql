-- Run after the migration against a disposable local Supabase database.
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ownership.sql
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.sites(id,owner_id,draft) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','{"title":"Original","chapters":[{"hidden":false,"media":[]},{"hidden":true,"text":"Secret","media":[]}]}');
select public.publish_site('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into storage.objects(bucket_id,name) values('birthday-media','11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/private.png');
update public.sites set draft='{"title":"Draft edit","chapters":[]}' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$ begin
 if not exists(select 1 from public.published_sites where snapshot->>'title'='Original' and jsonb_array_length(snapshot->'chapters')=1) then raise exception 'FAIL: snapshot isolation or hidden chapter leak'; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if exists(select 1 from public.sites) then raise exception 'FAIL: second user can read drafts'; end if;
 if exists(select 1 from storage.objects) then raise exception 'FAIL: second user can read private media'; end if;
 update public.sites set draft='{}' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 if found then raise exception 'FAIL: second user can update a foreign draft'; end if;
 delete from public.sites where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 if found then raise exception 'FAIL: second user can delete a foreign draft'; end if;
 begin
  insert into storage.objects(bucket_id,name) values('birthday-media','11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/foreign.png');
  raise exception 'FAIL: second user can upload to foreign folder';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.published_sites set snapshot='{}';
  raise exception 'FAIL: direct snapshot write allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.publish_site('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  raise exception 'FAIL: second user can publish';
 exception when raise_exception then
  if sqlerrm like 'FAIL:%' then raise; end if;
 end;
 begin
  perform public.unpublish_site('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  raise exception 'FAIL: second user can unpublish';
 exception when raise_exception then
  if sqlerrm like 'FAIL:%' then raise; end if;
 end;
 if public.owns_media_path('11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/private.png') then raise exception 'FAIL: foreign storage ownership'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if (select count(*) from public.published_sites) <> 1 then raise exception 'FAIL: public snapshot not readable'; end if;
end $$;
rollback;
