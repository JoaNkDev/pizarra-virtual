alter table public.persona_words enable row level security;
create policy "anon_read_words" on public.persona_words for select to anon using (true);
create policy "anon_insert_words" on public.persona_words for insert to anon with check (true);
create policy "anon_update_words" on public.persona_words for update to anon using (true) with check (true);
create policy "anon_delete_words" on public.persona_words for delete to anon using (true);
