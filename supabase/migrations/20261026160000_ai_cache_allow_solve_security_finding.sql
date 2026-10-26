-- Allow 'solve-security-finding' task in ai_cache check constraint

alter table public.ai_cache
  drop constraint if exists ai_cache_task_check;

alter table public.ai_cache
  add constraint ai_cache_task_check check (
    task in ('explain-file', 'explain-folder', 'classify-file', 'solve-security-finding')
  );
