-- Call retention.
-- A call's transcript is kept until 30 days after the caller's most recent
-- COMPLETED job (a job that reached its final stage), or 30 days after the call
-- itself when the caller has no completed job. A daily job purges the rest.

-- 1) Completion timestamp on jobs (the app stamps this when a job hits the
--    final stage, and clears it if the job moves back).
alter table public.jobs add column if not exists completed_at timestamptz;

-- 2) The purge function: delete calls past their keep-until date.
create or replace function public.purge_expired_calls() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  with gone as (
    delete from public.calls c
    where coalesce(
            (select max(j.completed_at)
               from public.jobs j
              where j.contact_id = c.contact_id
                and j.completed_at is not null),
            c.started_at
          ) + interval '30 days' < now()
    returning 1
  )
  select count(*) into deleted from gone;
  return deleted;
end;
$$;

-- 3) Run it daily at 03:00. Requires the pg_cron extension — enable it in
--    Supabase → Database → Extensions (search "pg_cron"). This block is a no-op
--    until then, and is safe to re-run. You can also just call
--    `select public.purge_expired_calls();` by hand anytime.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'purge-expired-calls') then
      perform cron.unschedule('purge-expired-calls');
    end if;
    perform cron.schedule('purge-expired-calls', '0 3 * * *', 'select public.purge_expired_calls();');
  end if;
end $$;
