-- Chat de atendimento dentro da central — 16/10/2026.
--
-- O provedor cola no painel o token da integração do sistema de atendimento
-- dele (hoje o FiberDesk), e a central ganha o botão "Falar no chat": o
-- servidor pede um link pessoal para o assinante logado e abre o atendimento
-- com o cliente já identificado, sem digitar CPF de novo.
--
-- Tabela à parte, e não colunas em `tenants`, porque a linha do provedor vai
-- inteira para o navegador da central. O token abre o atendimento de
-- qualquer assinante da conta: só o servidor pode lê-lo. Sem policy, como
-- tenant_apps e push_subscriptions — tudo passa pela service role.
--
-- Pode ser colado direto no SQL Editor. Idempotente.

create table if not exists tenant_chat (
  tenant_id uuid primary key references tenants(id) on delete cascade,

  -- Qual sistema de atendimento. Um só por enquanto; o campo existe para o
  -- próximo não pedir migração.
  provider text not null default 'fiberdesk' check (provider in ('fiberdesk')),

  -- Token cifrado (AES-256-GCM, lib/tenant/secret-box.ts). Nunca em claro.
  api_key text not null,
  -- Começo do token ("fdapp_a1b2…"), para o provedor saber qual está ativo
  -- sem que a tela mostre o token inteiro.
  key_hint text not null,

  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tenant_chat enable row level security;

drop trigger if exists trg_tenant_chat_updated on tenant_chat;
create trigger trg_tenant_chat_updated before update on tenant_chat
  for each row execute function set_updated_at();
