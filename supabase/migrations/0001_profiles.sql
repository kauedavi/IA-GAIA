-- ════════════════════════════════════════════════════════════════════
-- G.A.I.A. — perfis de usuário ligados ao Supabase Auth
-- ════════════════════════════════════════════════════════════════════
-- Como aplicar: Supabase Studio → SQL Editor → cole este arquivo → Run.
-- (ou `supabase db push`, se usar a CLI)
--
-- O Supabase Auth já guarda e-mail e senha em auth.users. Esta tabela
-- guarda SÓ o que é do G.A.I.A.: nome, perfil, turma, disciplinas, empresa.
-- Nunca criar coluna de senha aqui.
--
-- "visitante" não existe como perfil no banco: visitante é quem usa o app
-- sem conta, então não há linha em auth.users para ele.

begin;

create type public.gaia_role as enum ('aluno', 'professor', 'empresa', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) >= 2),
  role public.gaia_role not null default 'aluno',
  turma text,
  disciplinas text,
  empresa text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.profiles is 'Dados de perfil do G.A.I.A. para cada usuário do Supabase Auth.';

create index profiles_role_idx on public.profiles (role);

-- ── Row Level Security ──────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Cada um lê e escreve apenas o próprio perfil.
create policy "perfil proprio: leitura"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "perfil proprio: atualizacao"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (nome, turma, disciplinas, empresa) on public.profiles to authenticated;
grant all on public.profiles to service_role;

create schema if not exists gaia_private;
revoke all on schema gaia_private from public;
grant usage on schema gaia_private to authenticated;

create function gaia_private.usuario_e_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function gaia_private.usuario_e_admin() from public;
grant execute on function gaia_private.usuario_e_admin() to authenticated;

create policy "admin le todos os perfis"
  on public.profiles for select to authenticated
  using ((select gaia_private.usuario_e_admin()));

-- ── Perfil criado junto com o usuário ───────────────────────────────
-- Os dados vêm do options.data do signup (raw_user_meta_data).
create or replace function public.criar_perfil_do_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, role, turma, disciplinas, empresa)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), 'Sem nome'),
    case new.raw_user_meta_data ->> 'role'
      when 'professor' then 'professor'::public.gaia_role
      when 'empresa' then 'empresa'::public.gaia_role
      else 'aluno'::public.gaia_role
    end,
    nullif(trim(new.raw_user_meta_data ->> 'turma'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'disciplinas'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'empresa'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger criar_perfil_apos_signup
  after insert on auth.users
  for each row execute function public.criar_perfil_do_novo_usuario();

-- ── atualizado_em sempre em dia ─────────────────────────────────────
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger profiles_atualizado_em
  before update on public.profiles
  for each row execute function public.tocar_atualizado_em();

commit;
