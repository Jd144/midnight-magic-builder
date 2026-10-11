begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.sites(id,owner_id,draft) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','{"experience":"museum","title":"Preserved","chapters":[{"id":"5","hidden":false,"media":[]},{"id":"7","hidden":true,"text":"Private letter","media":[]}],"experienceSettings":{"universe":{"labels":{"5":"Visible","7":"Private planet"}},"classified":{"folders":{"7":"Private folder"}},"museum":{"order":["7","5"]},"time":{"dates":{"7":"2030-01-01","5":"2020-01-01"}}}}');
select public.publish_site('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
do $$ begin
 if not exists(select 1 from public.sites where draft #>> '{experienceSettings,universe,labels,7}'='Private planet') then raise exception 'FAIL: original draft settings changed'; end if;
 if exists(select 1 from public.published_sites where snapshot #> '{experienceSettings,universe,labels}' ? '7' or snapshot #> '{experienceSettings,classified,folders}' ? '7' or snapshot #> '{experienceSettings,time,dates}' ? '7') then raise exception 'FAIL: hidden theme settings leaked'; end if;
 if not exists(select 1 from public.published_sites where snapshot->>'experience'='museum' and snapshot #> '{experienceSettings,museum,order}'='["5"]'::jsonb) then raise exception 'FAIL: selected theme or exhibit order lost'; end if;
end $$;
rollback;
