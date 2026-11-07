alter table public.leo_runs drop constraint leo_runs_engine_check;
alter table public.leo_runs add constraint leo_runs_engine_check check(engine in ('template','openai','9router'));
alter table public.leo_runs add column model text not null default '' check(length(model)<=200),add column requested_model text not null default '' check(length(requested_model)<=200);
