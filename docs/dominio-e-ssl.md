# Domínio e SSL dos provedores

Como fazer `<provedor>.linkhub.api.br` nascer já com HTTPS, sem ninguém mexer
em painel a cada cadastro.

## O problema, medido

```
$ curl -I https://lmnet.linkhub.api.br            → 307   (ok)
$ curl -I https://naoexiste-teste.linkhub.api.br  → curl: (35) SSL/TLS connection failed
```

O DNS está certo: `*.linkhub.api.br` é um CNAME para a Vercel, em "Somente DNS",
então qualquer subdomínio **resolve**. Só que resolver não é certificar — a Vercel
só apresenta certificado para host que está **registrado no projeto**. Host que
ela não conhece derruba o handshake TLS antes de qualquer HTTP. É por isso que
provedor novo dá erro de certificado no navegador em vez de abrir a central.

E não dá para consertar isso com um certificado curinga hoje: o curinga na Vercel
sai por desafio DNS-01, e para responder esse desafio ela precisa mandar no DNS.
Os nameservers de `linkhub.api.br` são da Cloudflare (`kara`/`adam.ns.cloudflare.com`),
então a Vercel não consegue emitir `*.linkhub.api.br`.

Ou seja: **cada subdomínio precisa ser registrado no projeto da Vercel**. Feito
isso, o certificado sai sozinho em segundos (desafio HTTP-01, que já funciona
porque o curinga do DNS aponta para a borda da Vercel).

## A solução: ligar a automação que já existe no código

O caminho todo já está escrito:

| Peça | Onde |
| --- | --- |
| Cliente da API de domínios da Vercel | [src/lib/vercel/domains.ts](../src/lib/vercel/domains.ts) |
| Rota de provisionamento (POST/GET/DELETE) | [src/app/api/tenants/\[id\]/domain/route.ts](../src/app/api/tenants/[id]/domain/route.ts) |
| Chamada no cadastro do provedor | [src/app/signup/page.tsx:126](../src/app/signup/page.tsx#L126) |
| Tela "Domínio" no painel | [src/app/admin/tenants/\[id\]/dominio/](../src/app/admin/tenants/[id]/dominio/) |

O que falta é **`VERCEL_API_TOKEN`**. Sem ele, `isVercelConfigured()` devolve
falso, o provisionamento vira `unconfigured` e o subdomínio nunca é registrado —
exatamente o sintoma acima.

São duas peças, e as duas precisam estar de pé para o cadastro ficar automático:
o **token** (passos 1 a 4) e a **posse do domínio na Vercel** (passo 5.2). Só com
a primeira, o subdomínio é registrado mas fica pendente de um TXT por host.

### 1. Criar o token

[vercel.com/account/tokens](https://vercel.com/account/tokens) → **Create Token**

- Scope: o time **gusttavo33-8091's projects** (não "Personal Account")
- Expiração: `No Expiration` — se expirar, todo provedor novo volta a nascer sem HTTPS
- Guarde o valor: ele só aparece uma vez

### 2. Conferir project e team id

Já estão no `.env.local` (`VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`). Se precisar
reconferir: Vercel → projeto `linkhub` → **Settings → General → Project ID**, e
**Settings → General** do time para o Team ID.

### 3. Publicar as variáveis na Vercel

Projeto `linkhub` → **Settings → Environment Variables** → adicione nos três
ambientes (Production, Preview, Development):

```
VERCEL_API_TOKEN   = <token do passo 1>
VERCEL_PROJECT_ID  = prj_...
VERCEL_TEAM_ID     = team_...
```

Marque `VERCEL_API_TOKEN` como **Sensitive**. Pelo CLI, se preferir:

```bash
vercel env add VERCEL_API_TOKEN production
vercel env add VERCEL_PROJECT_ID production
vercel env add VERCEL_TEAM_ID production
```

### 4. Redeploy

Variável nova só entra em runtime novo: **Deployments → ... → Redeploy** no
último deploy de produção.

### 5. Backfill de quem já está cadastrado

Quem se cadastrou antes disso continua sem certificado. O script registra todos
de uma vez, lendo os provedores do Supabase:

```bash
node scripts/provisionar-dominios.mjs --dry-run   # mostra o que falta
node scripts/provisionar-dominios.mjs             # registra
```

Ele cobre também o domínio próprio de cada provedor (`custom_domain`) e imprime
os registros DNS pendentes quando a Vercel pede verificação.

### 5.1. O TXT que a Vercel pede em cada subdomínio

Hoje o registro não basta: a Vercel devolve cada subdomínio como **pendente**,
pedindo um TXT de propriedade.

```
$ curl -X POST .../domains/fibranet.linkhub.api.br/verify
{"error":{"code":"missing_txt_record",
 "message":"Domain _vercel.linkhub.api.br is missing required TXT Record
            \"vc-domain-verify=fibranet.linkhub.api.br,dc7590ee7f50d3abaf72\""}}
```

Isso acontece porque **o domínio `linkhub.api.br` não pertence a este time na
Vercel** — a API responde `forbidden: You don't have access to "linkhub.api.br"`
tanto no time quanto na conta pessoal. Quando o domínio está em outra conta, a
Vercel exige prova de posse **host a host**. É por isso que a Cloudflare já tem
dois TXT `_vercel` antigos, um para `app` e outro para `lmnet`: foi assim que
esses dois foram liberados, à mão.

Enquanto isso não mudar, cada provedor novo precisa de um TXT na Cloudflare:

| Tipo | Nome | Conteúdo |
| --- | --- | --- |
| TXT | `_vercel` | `vc-domain-verify=<slug>.linkhub.api.br,<token>` |

O token sai no `npm run dominios`. Pode haver vários TXT com o mesmo nome
`_vercel` — a Cloudflare aceita, é só ir somando. Na Cloudflare o campo **Nome**
recebe só `_vercel`, sem repetir o domínio.

Publicado o TXT, o botão **Provisionar agora** resolve o resto. Ele só passou a
funcionar depois de um conserto: registrar o domínio de novo **não** faz a Vercel
reconferir o TXT — é preciso chamar `POST /domains/<host>/verify`
(`verifyDomain()` em [domains.ts](../src/lib/vercel/domains.ts)). Antes disso o
clique não produzia efeito nenhum e o host ficava pendente para sempre.

### 5.3. Como a tela confirma o certificado

"Verificado" na Vercel só quer dizer que a posse do domínio foi provada — o
certificado sai alguns segundos depois. Quem responde de verdade é o handshake
TLS, então `getDomainStatus()` abre uma conexão HTTPS no próprio endereço antes
de dar o veredito:

| Estado | O que significa |
| --- | --- |
| `pending` | falta publicar o TXT — a tela mostra qual |
| `issuing` | verificado, certificado saindo (a tela se atualiza sozinha a cada 6s) |
| `ready` | handshake TLS passou: **cadeado no ar**, renovação automática |

O provedor vê "Certificado SSL ativo" só quando o HTTPS realmente responde, não
quando o painel acha que sim.

### 5.2. Como acabar com o TXT de vez

Traga o domínio para o time na Vercel: **Domains → Connect External →
`linkhub.api.br`**. A Vercel pede **um** TXT `_vercel` (o de reivindicação, não
um por host) e transfere o domínio para o time. Se ele estiver na sua conta
pessoal, o caminho mais curto é **Move**, sem DNS nenhum.

Com o domínio no mesmo time do projeto, subdomínio novo não pede mais TXT: o
`addDomain` registra, a Vercel valida sozinha pelo CNAME curinga e o certificado
sai em segundos. Aí sim o cadastro fica ponta a ponta automático.

### 6. Conferir

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://<slug>.linkhub.api.br/
```

`200`/`307` = certificado emitido. Erro 35 de SSL = ainda não registrou.
No painel, a tela **Domínio** do provedor mostra o mesmo estado em português.

## Cuidados que mantêm isso funcionando

- **O curinga tem que ficar em "Somente DNS" na Cloudflare.** Se alguém ligar o
  proxy (nuvem laranja), a Cloudflare intercepta o desafio HTTP-01 e a Vercel
  para de emitir certificado. Hoje está correto.
- **Nada de CAA restritivo** em `linkhub.api.br`. Hoje não existe registro CAA —
  se um dia adicionar, precisa liberar `letsencrypt.org`.
- **Não apague o `*.linkhub.api.br`.** É ele que faz o host resolver antes de
  qualquer registro na Vercel.
- **Limite de domínios por projeto:** planos Hobby param em 50 por projeto. A
  conta é Pro, então isso não é o gargalo agora — mas vale acompanhar conforme a
  base de provedores crescer.
- **Slug reservado:** `www`, `app`, `admin`, `api` e `auth` não viram provedor
  (`ROOT_HOSTS` no [middleware](../src/middleware.ts#L7)). Se o cadastro deixar
  alguém pegar um desses slugs, o subdomínio registra mas cai na landing.

## Se um dia quiser o curinga de verdade

A automação acima resolve o problema. As alternativas abaixo trocam a chamada de
API por um certificado curinga, mas custam mexer em DNS:

**Mover os nameservers para a Vercel** (`ns1`/`ns2.vercel-dns.com`) permite
`*.linkhub.api.br` de verdade — subdomínio novo funciona na hora, sem API. O
preço: recriar na Vercel os 20 registros que hoje estão na Cloudflare (MX e SPF
do e-mail, `cpanel`, `webmail`, `autoconfig`, `webdisk`, os SRV de CalDAV/CardDAV
e o A do site no `187.33.241.46`) e perder o proxy da Cloudflare nos hosts do
cPanel. Errar um MX aqui derruba o e-mail — é a opção mais arriscada.

**Delegar só o `_acme-challenge`** mantém a Cloudflare e ainda dá curinga, mas a
própria Vercel diz que isso **não vale para curinga no domínio raiz** — só em um
nível abaixo, tipo `*.central.linkhub.api.br`. Exigiria mudar o endereço de todos
os provedores (`NEXT_PUBLIC_ROOT_DOMAIN=central.linkhub.api.br`) e reemitir os
links já entregues. Só compensa se o volume de provedores crescer a ponto de o
registro por API incomodar.

## Referências

- [Adding & Configuring a Custom Domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain) — "If using your custom domain as a wildcard domain, you must use the nameservers method for verification"
- [Configuring Custom Domains — Multi-Tenant Platforms](https://vercel.com/docs/platforms/multi-tenant-platforms/configuring-domains) — o padrão de registrar cada domínio pela API
- [Can I use wildcard domains without switching to Vercel Nameservers?](https://vercel.com/kb/guide/wildcard-domain-without-vercel-nameservers) — a delegação de `_acme-challenge` e o limite do domínio raiz
