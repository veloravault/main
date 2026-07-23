-- getAdminOverview() summed vault_documents.size_bytes across every user by
-- paging through the entire table 1,000 rows at a time in JS, on every
-- single Overview page load. Harmless at small scale, but a genuine risk
-- once the table grows large enough to push that sequential round-trip loop
-- past a serverless function's execution limit - failing the Overview tab
-- exactly when an owner would most need it during an incident. A single
-- aggregate query does the same sum in the database instead.

create or replace function public.sum_vault_document_bytes()
returns bigint
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(sum(size_bytes), 0)::bigint from public.vault_documents;
$$;

revoke all on function public.sum_vault_document_bytes() from public, anon, authenticated;
grant execute on function public.sum_vault_document_bytes() to service_role;
