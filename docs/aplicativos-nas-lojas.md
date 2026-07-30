# Aplicativos dos provedores nas lojas

Como a central de cada provedor vira um app baixável. Este documento é o
mapa: o que já funciona, o que falta, e o que depende de você.

---

## Situação

| Etapa | Estado |
|---|---|
| PWA por provedor (manifest, service worker, ícones, assetlinks) | ✅ em produção |
| Ícone do app a partir da marca cadastrada, substituível no painel | ✅ em produção |
| Aba **Aplicativo** no painel | ✅ em produção |
| Build Android automatizado → `.aab` assinado | ✅ código pronto — falta ligar (2 passos abaixo) |
| Screenshots e ícones das lojas | ✅ em produção |
| Projeto iOS para o Xcode | ✅ em produção |
| Notificação push de fatura | ❌ próximo passo — é o que faz a Apple aceitar |
| Entrada por Face ID / biometria | ❌ depois do push |
| Deep links (abrir link da fatura dentro do app) | ❌ pequeno, depois |
| Envio automático para Play e TestFlight | ❌ opcional, quando o fluxo manual cansar |

---

## Onde paramos — 29/07/2026

Tudo que está marcado ✅ acima já está em produção. O que precisa de mão
humana, na ordem em que trava as coisas:

- [ ] **Confirmar o gerador de imagens.** Quebrava na Vercel com
      `libnss3.so: cannot open shared object file`; a correção está no
      deploy (`src/lib/screenshot/browser.ts`), mas não deu para testar
      daqui — a rota exige sessão de admin. Basta clicar em "Gerar imagens
      das lojas" em Marca & visual. Se aparecer estouro de memória em vez do
      erro antigo, a saída é `BROWSER_WS_ENDPOINT` (o código já usa).
- [ ] **Rodar a migração 006** — a própria aba Aplicativo mostra o SQL com
      botão de copiar.
- [ ] **Criar `GITHUB_DISPATCH_TOKEN`** na Vercel.
- [ ] **Instalar o workflow** copiando `docs/ci/android-build.yml` para
      `.github/workflows/android-build.yml` (detalhes no passo 3 abaixo).
- [ ] **Primeiro build Android de verdade.** O projeto TWA foi gerado e
      conferido aqui, mas o Gradle nunca compilou — esta máquina não tem SDK
      do Android e está com JDK 24, que o AGP não aceita. O primeiro build
      vai dizer; o log fica linkado na lista de builds do painel.
- [ ] **Colar o SHA-256 do Play App Signing** depois do primeiro envio, senão
      o app abre com a barra de endereço.
- [ ] **Backup da coluna `keystore_data`.** É a chave que assina os apps.

Depois disso, o próximo trabalho de código é o push — o plano detalhado está
no fim deste documento.

---

## Ligar o Android (dois passos, uma vez só)

**1. Rodar a migração.** Abra a aba Aplicativo de qualquer provedor: se as
tabelas não existirem, a própria tela mostra o SQL com um botão de copiar e o
link do SQL Editor. Cole, rode, recarregue. O arquivo também está em
`supabase/migrations/20260729_006_tenant_apps.sql`.

**2. Criar o token do GitHub.** Um fine-grained token em
github.com/settings/tokens com acesso ao repositório `gustavoviana/linkhub` e
permissão **Actions: read and write**. Depois:

```
vercel env add GITHUB_DISPATCH_TOKEN production
```

Opcionais, se um dia mudar de repositório ou branch: `GITHUB_BUILD_REPO`,
`GITHUB_BUILD_WORKFLOW`, `GITHUB_BUILD_REF`.

**3. Instalar o workflow.** O arquivo está versionado em
`docs/ci/android-build.yml`, e não em `.github/workflows/`, porque o token que
empurra este repositório não tem escopo `workflow` — o GitHub recusa o push de
arquivos de CI vindos dele. Duas saídas, ambas de um minuto:

- **Pelo site**: no GitHub, *Add file → Create new file*, nome
  `.github/workflows/android-build.yml`, cole o conteúdo de
  `docs/ci/android-build.yml`, commit na `main`.
- **Pelo terminal**: gere um token com escopo `workflow`, depois
  `mkdir -p .github/workflows && cp docs/ci/android-build.yml .github/workflows/`
  e `git push`.

Sem esse arquivo na `main`, o botão de build responde que o GitHub recusou o
disparo.

---

## Android: como funciona

A central vira um **Trusted Web Activity** — o app abre o domínio do provedor
em tela cheia, com o Chrome renderizando por baixo. É o caminho que o próprio
Google recomenda para site → app, e traz uma vantagem grande: **atualizar a
central não passa por revisão de loja**. Deploy na Vercel e o app de todos os
clientes já está atualizado. Só ícone, nome e versão exigem novo envio.

### O fluxo de cada provedor

1. Painel → provedor → aba **Aplicativo**. Nome, pacote e ícone já vêm
   preenchidos a partir da marca cadastrada. Salvar.
2. **Gerar pacote Android**. O GitHub Actions monta o projeto com o gerador do
   Bubblewrap, cria a chave de assinatura na primeira vez, compila e devolve o
   `.aab`. Leva de 5 a 10 minutos; a página se atualiza sozinha.
3. **Baixar .aab** e enviar no Play Console → Teste interno primeiro,
   Produção depois.
4. Depois do primeiro envio, o Play Console mostra em *Configuração →
   Integridade do app* a **impressão digital SHA-256** da chave que o Google
   usa para reassinar. Cole no campo do painel e salve.
5. Confira `https://<dominio-do-provedor>/.well-known/assetlinks.json` — deve
   listar o pacote e a impressão digital. **Sem esse passo o app abre com a
   barra de endereço do navegador em cima.** É a falha número um de TWA.

### A chave de assinatura

Nasce no primeiro build, dentro do runner, e volta cifrada (AES-256-GCM, mesma
chave do `ERP_CONFIG_ENCRYPTION_KEY`) para a tabela `tenant_apps`. **Perder o
banco sem backup = não conseguir mais atualizar os apps publicados.** Com o
Play App Signing dá para pedir redefinição da chave de upload ao Google, mas é
processo manual e demorado — vale um backup separado da coluna
`keystore_data`.

### Exigências da Play

| Item | Situação |
|---|---|
| Formato AAB | ✅ o build já gera |
| `targetSdk` 35 | ✅ (36 vira obrigatório perto de agosto/2026 — é bump no Bubblewrap) |
| Ícone 512 e capa 1024×500 | ✅ Marca & visual → "Publicar nas lojas" |
| Política de privacidade | ⚠️ URL por provedor, ainda manual |
| Formulário de Segurança de Dados | ⚠️ manual, uma vez por app |
| Conta nova de pessoa física: 12 testadores por 14 dias | ⚠️ oriente o cliente a abrir conta **de organização** e escapar disso |

---

## iOS: como funciona

Não existe TWA no iOS, e `.ipa` só se assina em macOS. Então o painel entrega
o **projeto pronto** e o Xcode do seu MacBook faz o resto — que é exatamente
como você pediu.

Botão **Baixar projeto iOS (Xcode)** na aba Aplicativo. O zip traz um projeto
Capacitor com identificador, nome, cores e ícone daquele provedor, apontando
para a central dele. No Mac:

```
npm install
npx cap add ios                       # gera o projeto do Xcode
npx capacitor-assets generate --ios   # ícones e splash
npx cap sync ios
npx cap open ios
```

Depois: time de desenvolvimento em *Signing & Capabilities*, destino *Any iOS
Device*, *Product → Archive → Distribute App*. TestFlight primeiro, sempre —
um `.ipa` de App Store não instala direto no aparelho.

### O que falta antes de submeter (importante)

**A Apple reprova app que é só um site embrulhado** — diretriz 4.2, Minimum
Functionality. Hoje o projeto é exatamente isso. Não adianta mexer no layout
para disfarçar: o revisor abre o app, vê um site dentro de uma casca, e
recusa. O que muda o resultado é funcionalidade nativa de verdade:

1. **Push de fatura vencendo** — o mais forte, e o que os provedores mais
   pedem. Também é o melhor argumento na resposta ao revisor.
2. **Face ID / Touch ID** para entrar sem digitar CPF.
3. **Cache offline** da última fatura e do código Pix.
4. **Deep links** (`apple-app-site-association`, no mesmo esquema por host que
   o `assetlinks.json` já usa).

Com push + biometria, passa. Sem push, eu não submeteria.

### Quem publica (diretriz 4.2.6)

Apps saídos de gerador são recusados **quando enviados pela conta do
fornecedor**. Como o cliente vai bancar os US$ 99/ano, publique **na conta
dele** — é exatamente o que a Apple pede, e você entra como desenvolvedor
autorizado. A conta de agência funciona para os primeiros e fica arriscada no
volume; se for por aí, espace os envios e garanta marca e conteúdo bem
distintos entre os apps.

### Diferenciação entre os apps

Já existe de graça: três layouts (v1/v2/v3), cores, logo e nome por provedor.
Use layouts diferentes entre clientes e cada app fica visivelmente distinto.
Maquiagem — mudar um raio de borda para parecer outro app — não engana revisão
e não é disso que a diretriz trata.

---

## Próximo trabalho: push de fatura

É o item que destrava o iOS (sem ele a Apple reprova pela 4.2) e o que mais
agrega no Android. O desenho abaixo já está decidido — amanhã é executar.

### Ordem de execução

**1. Migração 007 — `push_devices`**

```
id            uuid pk
tenant_id     uuid → tenants
customer_id   uuid → customers
platform      text  'web' | 'ios'
endpoint      text  URL do Web Push, ou o device token do APNs
p256dh, auth  text  só no Web Push
user_agent    text
created_at, last_seen_at
unique (tenant_id, endpoint)
```

Sem policy de leitura, como as tabelas do app: acesso só pela service role.
Um `push_sends (device_id, invoice_id, kind, sent_at)` evita mandar o mesmo
aviso duas vezes — `unique (invoice_id, kind, device_id)`.

**2. Web Push — cobre Android (TWA) e PWA no desktop**

Chaves VAPID em `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`
(gerar com `npx web-push generate-vapid-keys`). Biblioteca `web-push`.
O service worker de `src/app/sw.js/route.ts` ganha dois listeners:

```js
self.addEventListener('push', …)              // monta a notificação
self.addEventListener('notificationclick', …) // abre /fatura/<id>
```

**3. Opt-in na central**

Banner discreto na home ("Avisar quando a fatura chegar") e um interruptor em
Minha Conta. O opt-out é exigência das duas lojas — sem ele a ficha é
recusada. `POST /api/portal/push/subscribe` grava o dispositivo do assinante
logado; `DELETE` remove.

**4. Disparo diário**

Rota nova `/api/cron/notify-invoices`, no mesmo esquema do
`/api/cron/sync-erp` que já existe (`vercel.json` → `crons`). Uma vez por dia,
meio-dia: para cada provedor, faturas **vencendo em 3 dias**, **vencendo
hoje** e **vencidas ontem**. Texto com a marca do provedor e o valor.

**5. iOS — APNs, sem Firebase**

O gerador do projeto (`src/lib/appgen/ios-project.ts`) passa a incluir
`@capacitor/push-notifications`. O aparelho devolve o device token do APNs; o
envio é HTTP/2 direto com JWT assinado pela chave `.p8` da conta Apple do
provedor (`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_P8` cifrada por provedor).
Evita a dependência do Firebase, que só existe para reempacotar o mesmo APNs.

**6. Painel**

A aba Aplicativo mostra quantos aparelhos estão registrados e ganha um botão
"enviar notificação de teste" — é o que se usa para provar ao revisor da
Apple que o recurso nativo existe.

### Estimativa

Passos 1 a 4 (Android e PWA funcionando): **3 a 4 dias**.
Passo 5 (iOS): **2 dias**, depois de a conta Apple do primeiro cliente existir.
Em seguida: biometria (2 dias) e deep links (1 dia).

---

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `GITHUB_DISPATCH_TOKEN` | acionar o build Android (obrigatória) |
| `GITHUB_BUILD_REPO` / `_WORKFLOW` / `_REF` | mudar repo, arquivo ou branch do CI |
| `ERP_CONFIG_ENCRYPTION_KEY` | já existia — agora também cifra a keystore |
| `STORE_SHOT_SECRET` | assina o passe das rotas de captura; sem ela usa a service key |
| `BROWSER_WS_ENDPOINT` | manda os screenshots para um serviço de navegador em vez do Chromium da função |
| `CHROME_PATH` | só em dev, quando o Chrome não está num caminho conhecido |
| `STORE_SHOT_FONT_URL` | fonte extra (emoji) no Chromium serverless |
