# Banco — estado real e como aplicar

## O que está no ar

O schema em produção veio de **`all_in_one.sql`**, não da pasta `migrations/`.
Os arquivos `20260512_000` a `20260512_003` criam os helpers no schema `auth`
(`auth.user_tenant_ids()`), enquanto o banco tem os mesmos helpers em `public`
(`public.user_tenant_ids()`). São duas variantes do mesmo schema, e a que vale
é a segunda.

**Não rode `supabase db push`.** Ele tentaria aplicar a variante `auth.*` por
cima e conflitaria com o que existe.

## Como aplicar mudanças hoje

Cole o SQL no **SQL Editor** do projeto Supabase, na ordem:

| arquivo | quando |
|---|---|
| `all_in_one.sql` | instalação nova, do zero |
| `migrations/20260727_004_fix_rls_security.sql` | já aplicado em produção em 27/07/2026 |
| `migrations/20260727_005_portal_auth_mode.sql` | já aplicado (coluna `portal_require_password` existe) |
| `migrations/20260729_006_tenant_apps.sql` | já aplicado (tabela `tenant_apps` existe) |
| `migrations/20260731_007_logo_dark.sql` | **pendente** — sem ele, a logo do modo escuro não salva |
| `migrations/20260731_008_login_screen.sql` | **pendente** — sem ele, a imagem e os textos da tela de entrada não salvam |

O estado de cada um foi conferido consultando as colunas em produção, não pela
data do arquivo.

O `all_in_one.sql` já nasce com as correções do `004` embutidas — as duas
rotas levam ao mesmo estado final.

## O que o 004 corrigiu

1. **Recursão infinita de RLS em `tenant_admins`** (`42P17`). A policy
   consultava a própria tabela, então todo `select` autenticado dava 500 e o
   painel listava zero provedores.
2. **`erp_config` legível pela chave pública.** O `select` era `using (true)`,
   expondo token do IXC e senha do Hubsoft de todos os provedores.
3. **Colunas sensíveis alteráveis pelo navegador.** Um admin de tenant
   conseguia mudar `slug`, `status` e `custom_domain_verified` direto no
   browser. Um trigger passa a reverter isso para quem não é `service_role`.

## Pendência conhecida

A pasta `migrations/` precisa ser reescrita na variante `public.*` para voltar
a servir de fonte única. Enquanto isso não acontece, `all_in_one.sql` é a
referência.
