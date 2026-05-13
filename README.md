# LinkHub

Plataforma multi-tenant SaaS para provedores de internet criarem sua **Central do Cliente** em minutos, com integração nativa aos ERPs do mercado brasileiro (IXC Soft, SGP, Hubsoft, MK Solutions).

Cada provedor recebe um subdomínio (ex: `linknet.linkhub.api.br`) onde seus clientes acessam, consultam faturas, pagam por Pix, baixam boleto e abrem chamados. Tudo isolado por RLS no Supabase.

## Stack

- **Next.js 15** (App Router, RSC, route handlers)
- **TypeScript** estrito
- **Tailwind CSS** com tema dinâmico por tenant via CSS variables
- **Supabase** (Postgres + Auth + Storage + RLS)
- **Vercel** (hosting + edge middleware)

## Funcionalidades

### Para o LinkHub (admin global)
- Landing pública e signup de novos provedores
- Cada signup cria um tenant + vincula o usuário como owner

### Para o provedor (admin do tenant)
- Painel administrativo em `linkhub.api.br/admin`
- Configurar marca: logo, cores (paletas prontas), modo escuro padrão
- Escolher layout do portal (V1 Clean / V2 Neo / V3 Friendly)
- Conectar ERP: IXC, SGP, Hubsoft (com teste de conexão)
- Sincronizar planos do ERP
- Listar clientes cadastrados
- Configurar contato de suporte (WhatsApp, telefone, e-mail)

### Para o cliente final (portal)
- Acessa via subdomínio do provedor com CPF + senha
- Home com saudação, fatura aberta, atalhos, conexão ao vivo
- Lista de faturas com status (pago/aberto/atrasado)
- Detalhe da fatura: copia-cola Pix, linha digitável do boleto, PDF, NFSe
- Suporte: resoluções rápidas + canais diretos (WhatsApp/tel/e-mail)
- Conta: dados pessoais, endereço, plano contratado

## Arquitetura multi-tenant

```
linkhub.api.br              → Landing + signup + admin (rotas root)
{slug}.linkhub.api.br       → Portal do tenant (rewrite middleware → /portal/*)
{custom-domain}             → Portal do tenant (resolvido via custom_domain)
```

O `middleware.ts` extrai o subdomínio do host, escreve em `x-tenant-slug`, e reescreve `/` → `/portal`. O `<PortalLayout>` resolve o tenant via SQL (cache por request) e aplica o tema (cores, layout, dark mode) usando CSS variables.

Isolamento de dados via **Row-Level Security**: cada tabela tem políticas que limitam acesso por `tenant_id`. Admins do tenant veem só os dados do seu tenant; clientes finais veem só os próprios.

## Como rodar localmente

### 1. Pré-requisitos
- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase` ou via npm)
- Docker (para o Supabase local)

### 2. Instalar dependências
```bash
npm install
```

### 3. Subir Supabase local
```bash
npx supabase start
```
Anota as URLs e chaves que o CLI imprime.

### 4. Aplicar migrações
```bash
npx supabase db reset
```
Isso roda os arquivos em `supabase/migrations/` + `supabase/seed.sql`.

### 5. Configurar variáveis de ambiente
Copie `.env.local.example` para `.env.local` e preencha:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-do-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<service-key-do-supabase-start>
NEXT_PUBLIC_ROOT_DOMAIN=linkhub.api.br
NEXT_PUBLIC_APP_URL=http://localhost:3000
ERP_CONFIG_ENCRYPTION_KEY=$(openssl rand -base64 32)
```

### 6. Rodar
```bash
npm run dev
```

Acesse:
- `http://localhost:3000` → landing
- `http://localhost:3000/signup` → criar provedor
- `http://localhost:3000/admin` → painel admin (precisa estar logado)
- `http://localhost:3000?tenant=demo` → portal do tenant demo (precisa estar logado como cliente)

> Em dev, como não temos subdomínios reais, use o querystring `?tenant=<slug>` para simular.

## Deploy em produção

### A. Provisionar Supabase em produção

1. Criar projeto em [supabase.com/dashboard](https://supabase.com/dashboard) na região `sa-east-1` (São Paulo).
2. Linkar o projeto local ao remoto:
   ```bash
   npx supabase link --project-ref <seu-project-ref>
   ```
3. Aplicar migrações no remoto:
   ```bash
   npx supabase db push
   ```
4. No painel do Supabase → Authentication → URL Configuration, adicione:
   - Site URL: `https://linkhub.api.br`
   - Redirect URLs: `https://linkhub.api.br/auth/callback`, `https://*.linkhub.api.br/auth/callback`
5. Copie a `Project URL`, `anon key` e `service_role key` (Settings → API).

### B. Provisionar Vercel

1. Faça push do código para um repositório Git (GitHub/GitLab/Bitbucket).
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório. O Vercel detecta Next.js automaticamente.
3. Em **Environment Variables**, adicione:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<seu-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-key>
   NEXT_PUBLIC_ROOT_DOMAIN=linkhub.api.br
   NEXT_PUBLIC_APP_URL=https://linkhub.api.br
   ERP_CONFIG_ENCRYPTION_KEY=<gere com openssl rand -base64 32>
   ```
4. Clique em **Deploy**.

### C. Configurar domínios

No Vercel → **Settings → Domains** do projeto:

1. Adicione o domínio raiz: `linkhub.api.br`
2. Adicione o **wildcard** para tenants: `*.linkhub.api.br`
3. Aponte no seu DNS (Registro.br, Cloudflare, etc):
   ```
   A     linkhub.api.br      76.76.21.21        (Vercel)
   CNAME *.linkhub.api.br    cname.vercel-dns.com
   ```
4. Aguarde a propagação. Após validado, qualquer `<slug>.linkhub.api.br` será roteado para o app.

### D. Verificar deploy

- `https://linkhub.api.br` → landing
- `https://linkhub.api.br/signup` → criar conta
- `https://demo.linkhub.api.br` → portal do tenant seed

## Estrutura

```
src/
  app/
    page.tsx                  Landing
    layout.tsx                Root
    globals.css
    (auth)/
      login/page.tsx          Login admin
      signup/page.tsx         Signup provedor
    auth/
      callback/route.ts       Email confirmation
      logout/route.ts         Signout
    admin/                    Painel do provedor
      layout.tsx
      page.tsx                Dashboard
      tenants/
        new/page.tsx          Criar tenant
        [id]/
          layout.tsx          Header com tabs do tenant
          page.tsx            Overview
          branding/           Cores, logo, layout
          erp/                Config ERP + teste de conexão
          customers/page.tsx
          plans/page.tsx
    portal/                   Portal do cliente final (renderizado quando há subdomínio)
      layout.tsx              Aplica tema do tenant
      page.tsx                Home (escolhe V1/V2/V3 conforme tenant.layout)
      login/                  Login por CPF+senha
      fatura/                 Lista + detalhe (Pix/boleto/NFSe)
      suporte/page.tsx
      conta/page.tsx
      not-found.tsx
    api/
      tenants/[id]/erp/
        test/route.ts         Testar credenciais
        sync-plans/route.ts   Sincronizar planos
      portal/auth/
        login/route.ts        Login CPF → Supabase Auth
  components/
    ui/                       Button, Input, Card, Badge
    portal/                   Icons, BottomNav, HomeV1, HomeV2, HomeV3
  lib/
    supabase/
      client.ts               Browser
      server.ts               RSC (com cookies)
      admin.ts                Service role
      types.ts                Tipos do schema
    tenant/
      resolve.ts              Resolve tenant atual (request-cached)
      theme.ts                CSS variables baseadas nas cores do tenant
    auth/session.ts           Helpers de auth
    erp/
      types.ts                ErpAdapter interface
      mock.ts                 Dados de teste
      ixc.ts                  IXC Soft
      sgp.ts                  SGP
      hubsoft.ts              Hubsoft
      index.ts                Factory getAdapterForTenant()
    utils.ts                  cn, formatBRL, mask*, slugify
  middleware.ts               Subdomain routing + auth cookie refresh
supabase/
  migrations/
    20260512_000_init.sql     Schema (tenants, customers, contracts, invoices...)
    20260512_001_rls.sql      Row-Level Security
    20260512_002_storage.sql  Bucket de logos
    20260512_003_signup_rpc.sql  create_tenant_with_owner RPC
  seed.sql                    Tenant demo + planos
  config.toml
```

## Como adicionar um novo adapter ERP

1. Crie `src/lib/erp/<seu-erp>.ts` exportando uma classe que implementa `ErpAdapter`.
2. Adicione o tipo em `src/lib/supabase/types.ts` (`ErpType`).
3. Adicione o case em `src/lib/erp/index.ts` (`getAdapterForTenant`).
4. Adicione a UI em `src/app/admin/tenants/[id]/erp/erp-form.tsx` para coletar credenciais.
5. Crie a migração SQL para adicionar o valor no enum `erp_type`.

A interface define apenas:
- `testConnection()` → valida credenciais
- `listPlans()` → catálogo
- `findCustomerByCpf()` → busca cliente
- `listContractsByCustomer()` → contratos do cliente
- `listInvoicesByContract()` → faturas
- `getInvoice()` → detalhe (com Pix/boleto)

Tudo retorna no formato canônico (`ErpCustomer`, `ErpPlan`, `ErpInvoice`...).

## Notas de segurança

- **Service role key**: usada só em route handlers e jobs. Nunca expor no browser.
- **erp_config**: credenciais ficam em `jsonb` no Postgres. Por padrão, RLS só permite leitura por admins do tenant. Recomendado adicionar criptografia em coluna (pgsodium) antes de prod — esqueleto pronto via `ERP_CONFIG_ENCRYPTION_KEY`.
- **CPF como login**: o e-mail real do cliente é usado quando disponível; caso contrário, geramos `cliente-<slug>-<cpf>@linkhub.local` (não verificado).
- **RLS** está habilitado em todas as tabelas com isolamento por `tenant_id`. Veja `20260512_001_rls.sql`.

## Próximos passos

- [ ] Criptografar `erp_config` com pgsodium / chave server-side
- [ ] Worker (cron) de sincronização periódica do ERP
- [ ] Webhook do gateway de pagamento para atualizar status de fatura em tempo real
- [ ] Métricas e dashboard do tenant (consumo de banda, tickets abertos)
- [ ] PWA installable do portal (manifest + service worker)
- [ ] App mobile React Native compartilhando os mesmos endpoints
- [ ] Domínio customizado por tenant (valida DNS via API da Vercel)

## Licença

Privado / proprietário.
