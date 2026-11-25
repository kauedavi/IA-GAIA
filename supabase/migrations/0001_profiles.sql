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
-- Sem isto, a anon key daria acesso à tabela inteira.
alter table public.profiles enable row level security;

-- Cada um lê e escreve apenas o próprio perfil.
create policy "perfil proprio: leitura"
  on public.profiles for select
  using (auth.uid() = id);

create policy "perfil proprio: atualizacao"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- A criação normalmente vem do trigger abaixo; esta policy cobre o caso
-- de o cliente criar o perfil logo após o signup.
create policy "perfil proprio: insercao"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Ninguém promove a si mesmo a admin pelo cliente: a coluna role só muda
-- por service_role (que ignora RLS) ou pelo SQL Editor.
create policy "admin le todos os perfis"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles autor
      where autor.id = auth.uid() and autor.role = 'admin'
    )
  );

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
    coalesce(
      nullif(new.raw_user_meta_data ->> 'role', '')::public.gaia_role,
      'aluno'
    ),
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
