-- Security audits and findings tables.
-- Each analysis can have one security audit, storing deterministic loophole
-- and vulnerability scanning results with row-level security per organization.

create table public.security_audits (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null unique,
  status text not null check (status in ('running', 'complete', 'failed')),
  critical_count integer not null default 0,
  high_count integer not null default 0,
  medium_count integer not null default 0,
  low_count integer not null default 0,
  info_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (id, organization_id),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade
);

create table public.security_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  audit_id uuid not null,
  analysis_id uuid not null,
  file_path text not null,
  line_number integer,
  rule_id text not null,
  category text not null check (category in ('ast_sink', 'secret_leak', 'sca_vulnerability', 'reachability_risk', 'config_flaw')),
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  title text not null,
  description text not null,
  code_snippet text,
  is_reachable boolean not null default false,
  reachability_chain jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (audit_id, organization_id)
    references public.security_audits (id, organization_id) on delete cascade,
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade
);

create index on public.security_audits (analysis_id, organization_id);
create index on public.security_audits (organization_id);
create index on public.security_findings (audit_id, organization_id);
create index on public.security_findings (analysis_id, organization_id);
create index on public.security_findings (organization_id);

revoke all on public.security_audits, public.security_findings from anon, authenticated;
grant select on public.security_audits, public.security_findings to authenticated;

create policy "members read their organization's rows" on public.security_audits
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));

create policy "members read their organization's rows" on public.security_findings
  for select to authenticated
  using (organization_id = (select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')));
