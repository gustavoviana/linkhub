# Aplicativos dos provedores nas lojas

Como a central de cada provedor vira um app baixável — o que já está pronto,
o que precisa ser ligado uma vez, e o caminho do iOS.

---

## Android — pronto

A central vira um **Trusted Web Activity**: o app abre a central do provedor
em tela cheia, com o Chrome renderizando por baixo. É o caminho que o próprio
Google recomenda para site → app, e tem uma vantagem grande para o seu
negócio: **atualização da central não passa por revisão de loja**. Deploy na
Vercel e o app de todo mundo já está atualizado. Só mudança de ícone, nome ou
versão exige novo envio.

### Ligar uma vez

1. **Rodar a migração.** No SQL Editor do Supabase, cole
   `supabase/migrations/20260729_006_tenant_apps.sql`. Cria `tenant_apps` e
   `tenant_app_builds`. Sem isso a aba Aplicativo mostra um aviso no lugar do
   formulário.

2. **Criar o token do GitHub.** Um fine-grained token em
   github.com/settings/tokens com acesso ao repositório `gustavoviana/linkhub`
   e permissão **Actions: read and write**. Depois:

   ```
   vercel env add GITHUB_DISPATCH_TOKEN production
   ```

   Variáveis opcionais, se um dia mudar de repo ou de branch:
   `GITHUB_BUILD_REPO`, `GITHUB_BUILD_WORKFLOW`, `GITHUB_BUILD_REF`.

3. **Conferir o bucket.** `tenant-apps`, privado — já criado.

### O fluxo de cada provedor

1. Painel → provedor → aba **Aplicativo**. Nome, pacote e ícone já vêm
   preenchidos a partir da marca cadastrada. Salvar.
2. **Gerar pacote Android**. O GitHub Actions monta o projeto, cria a chave de
   assinatura na primeira vez, compila e devolve o `.aab`. Leva de 5 a 10
   minutos; a página se atualiza sozinha.
3. **Baixar .aab** e enviar no Play Console → Produção (ou Teste interno).
4. Depois do primeiro envio, o Play Console mostra em *Configuração →
   Integridade do app* a **impressão digital SHA-256** da chave que o Google
   usa para reassinar. Cole no campo do painel e salve.
5. Confira `https://<dominio-do-provedor>/.well-known/assetlinks.json` — deve
   listar o pacote e a impressão digital. **Sem esse passo o app abre com a
   barra de endereço do navegador aparecendo.** É a falha mais comum de TWA.

### A chave de assinatura

Nasce no primeiro build, dentro do runner, e volta cifrada (AES-256-GCM, mesma
chave do `ERP_CONFIG_ENCRYPTION_KEY`) para a tabela `tenant_apps`. **Perder o
banco sem backup = não conseguir mais atualizar os apps publicados.** Com o
Play App Signing ativado dá para pedir redefinição da chave de upload ao
Google, mas é processo manual e demorado — vale um backup separado da coluna
`keystore_data`.

### Exigências da Play que valem hoje

| Item | Situação |
|---|---|
| Formato AAB | ✅ o build já gera |
| `targetSdk` 35 | ✅ (36 vira obrigatório perto de agosto/2026 — é bump no Bubblewrap) |
| Ícone 512 e capa 1024×500 | ✅ pela aba Marca & visual → "Publicar nas lojas" |
| Política de privacidade | ⚠️ URL por provedor, ainda manual |
| Formulário de Segurança de Dados | ⚠️ manual, uma vez por app |
| Conta nova pessoa física: 12 testadores por 14 dias | ⚠️ oriente o cliente a abrir conta **de organização** e escapar disso |

---

## iOS — o caminho

Não dá para gerar `.ipa` em Linux: assinar exige `codesign`, que só existe em
macOS. Como você tem o MacBook, o desenho muda de figura — o painel entrega o
**projeto pronto** e o Xcode faz o resto.

### Abordagem recomendada: Capacitor

TWA não existe no iOS. O equivalente é um app nativo mínimo com `WKWebView`
apontando para a central. Capacitor é o mais maduro para isso e dá acesso ao
que a Apple exige ver de nativo.

### O ponto crítico: diretriz 4.2

**Um WebView que só abre um site é rejeitado.** Não adianta mexer no layout
para "disfarçar" — o revisor abre o app, vê que é um site embrulhado, e
recusa. O que muda o resultado é funcionalidade nativa de verdade:

1. **Push de fatura vencendo** — sozinho já justifica o app, e é o que os
   provedores mais pedem. Também é o argumento mais forte na resposta ao
   revisor.
2. **Face ID / Touch ID** para entrar sem digitar CPF.
3. **Cache offline** da última fatura e do código Pix.
4. **Deep links** (`apple-app-site-association`, no mesmo esquema por host que
   o `assetlinks.json` já usa).

Com esses quatro, o app passa. Sem push, eu não submeteria.

### A diretriz 4.2.6, que é a que pega em agência

Apps saídos de gerador/template são recusados **quando enviados pela conta do
fornecedor**. O texto da Apple é explícito: quem envia tem que ser o dono do
conteúdo. Traduzindo para o seu caso:

- **Cliente com conta própria** (US$ 99/ano, que ele já vai bancar): caminho
  limpo, é exatamente o que a Apple pede. Você entra como desenvolvedor
  autorizado na conta dele.
- **Sua conta de agência**: funciona para os primeiros, fica arriscado no
  volume. Se for por aí — espace os envios, e garanta que cada app tenha
  conteúdo e marca claramente distintos.

Na Play o mesmo raciocínio vale, com fiscalização bem mais leve.

### Diferenciação entre os apps

A central já tem três layouts (v1/v2/v3), cores, logo e nome por provedor —
use isso de verdade: cliente diferente, layout diferente. Combinado com
ícone, splash, nome e descrição próprios, cada app fica visivelmente distinto.
O que **não** funciona é maquiagem: mudar um raio de borda para parecer outro
app não engana revisão, e não é disso que a diretriz trata.

### Passo a passo quando for a hora

1. O painel gera o projeto Capacitor do provedor (ícones, nome, bundle id,
   cores, URL) — mesma ficha da aba Aplicativo, botão separado.
2. No MacBook: `npx cap sync ios`, abrir no Xcode, Archive, Distribute App.
3. Requisitos atuais: Xcode 16+, SDK iOS 18, `PrivacyInfo.xcprivacy` (o
   Capacitor já traz), declaração de criptografia e política de privacidade.
4. TestFlight primeiro, sempre — o `.ipa` de App Store não instala direto no
   aparelho.

Esforço estimado: 4–6 dias para push + biometria, 3–4 dias para o gerador do
projeto iOS.
