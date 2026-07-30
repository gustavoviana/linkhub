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

> O arquivo `.github/workflows/android-build.yml` está num commit local que
> não subiu: o token que empurra este repositório não tem escopo `workflow` e
> o GitHub recusou. Gere um token com esse escopo e dê `git push`, ou cole o
> arquivo pelo editor do GitHub.

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

## Próximo passo recomendado: push de fatura

É o item que destrava o iOS e o que mais agrega no Android. Desenho:

1. Tabela `push_devices` (tenant, customer, token, plataforma).
2. Web Push no Android/PWA (VAPID, já dá para fazer no service worker que
   existe) e APNs no iOS via `@capacitor/push-notifications` + Firebase.
3. Rotina diária: fatura vencendo em 3 dias, vencendo hoje, vencida ontem.
   Reaproveita o cron que já sincroniza o ERP.
4. Preferência por assinante em Minha Conta (a loja exige o opt-out).

Estimativa: 4 a 6 dias. Depois disso, biometria (2 dias) e deep links (1 dia).

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
