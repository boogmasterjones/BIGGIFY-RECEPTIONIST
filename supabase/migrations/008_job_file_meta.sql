-- Nameable photos/files: a user-set caption + a note per job file.
alter table public.job_files add column if not exists caption text;
alter table public.job_files add column if not exists note    text;
