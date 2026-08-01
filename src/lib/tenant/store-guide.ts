import type { StoreCopyContext } from './store-copy';

// O passo a passo de publicação nas duas lojas, escrito para este app: uma
// central do assinante de provedor de internet, empacotada como TWA no
// Android e como projeto Capacitor no iOS.
//
// Por que isto vive no painel e não num PDF: cada campo aqui tem a resposta
// já decidida para *este* tipo de app. Guia genérico manda "responda o
// questionário de classificação"; este diz qual alternativa marcar e o que
// acontece se marcar a outra. As respostas de conteúdo e de dados foram
// escritas a partir do que a central realmente faz — mexeu no que o app
// coleta, volte aqui e reveja a etapa de Segurança dos dados.
//
// Conferido contra as regras vigentes em agosto de 2026. As lojas mudam
// exigência sem avisar: os links oficiais de cada etapa são a fonte, este
// texto é o atalho.

export type GuideStore = 'play' | 'apple';

export type GuideBlock =
  | { kind: 'text'; text: string }
  | { kind: 'note'; tone: 'info' | 'warning' | 'danger' | 'success'; title?: string; text: string }
  | { kind: 'checks'; items: { id: string; text: string; detail?: string }[] }
  | { kind: 'fields'; caption?: string; rows: { field: string; value: string; why?: string }[] }
  | { kind: 'copy'; copyId: string }
  | { kind: 'links'; items: { label: string; url: string }[] };

export interface GuideStep {
  id: string;
  title: string;
  summary: string;
  blocks: GuideBlock[];
}

/** Marcos que valem para as duas lojas — ficam acima das abas. */
export const PRE_REQUISITOS: { id: string; text: string; detail: string }[] = [
  {
    id: 'pre-privacidade',
    text: 'Política de privacidade publicada numa URL pública',
    detail:
      'Obrigatória nas duas lojas, e é o item que mais atrasa envio. O texto pronto está no fim desta página — publique numa página do site do provedor e guarde o endereço.',
  },
  {
    id: 'pre-imagens',
    text: 'Ícone, capa e capturas de tela gerados',
    detail:
      'Aba Marca & visual › "Publicar nas lojas". Sai um ZIP com o ícone 512, a capa 1024×500 da Play, o ícone 1024 da Apple e as capturas no pixel exato de cada loja.',
  },
  {
    id: 'pre-conta-teste',
    text: 'Um cliente de teste com faturas de exemplo',
    detail:
      'As duas lojas fazem revisão humana e o app é todo atrás de login. Sem CPF e senha que funcionem, a reprovação é automática — e custa de 2 a 7 dias por rodada. Crie na aba Clientes e anote o CPF e a senha.',
  },
  {
    id: 'pre-dominio',
    text: 'Domínio próprio do provedor, com SSL válido',
    detail:
      'A ficha das lojas pede site e política de privacidade no domínio da empresa. No Android é mais que estética: o app abre esse domínio e é ele que assina o assetlinks.json.',
  },
];

export function playSteps(c: StoreCopyContext): GuideStep[] {
  return [
    {
      id: 'play-1',
      title: 'Abrir a conta certa — de organização, não pessoal',
      summary: 'A escolha da conta decide se o app publica em uma semana ou em um mês.',
      blocks: [
        {
          kind: 'note',
          tone: 'danger',
          title: 'É aqui que quase todo mundo se enrola',
          text:
            'Conta pessoal criada depois de 13/11/2023 só libera a produção depois de um teste fechado com no mínimo 12 testadores que ficaram 14 dias seguidos com o app instalado. Conta de organização, registrada no CNPJ do provedor, está isenta disso. Como o provedor tem CNPJ, abrir conta pessoal é jogar quatro semanas fora.',
        },
        {
          kind: 'checks',
          items: [
            {
              id: 'play-1-duns',
              text: 'Pedir o D-U-N-S da empresa (grátis, na Dun & Bradstreet)',
              detail:
                'É o "CNPJ internacional" que o Google exige da conta de organização. Sai em alguns dias úteis e o nome cadastrado precisa bater com a razão social do CNPJ, letra por letra — divergência aqui derruba a verificação e recomeça o prazo.',
            },
            {
              id: 'play-1-conta',
              text: 'Criar a conta em play.google.com/console/signup como organização',
              detail: 'Taxa de US$ 25, uma vez na vida da conta, não por app.',
            },
            {
              id: 'play-1-verificacao',
              text: 'Concluir a verificação: documentos, endereço, telefone e site da empresa',
              detail:
                'O Google só libera a publicação com a conta verificada. Use o e-mail e o telefone que a empresa atende de verdade — há confirmação por ligação ou mensagem.',
            },
            {
              id: 'play-1-pagamentos',
              text: 'Vincular um perfil de pagamentos à conta',
              detail: 'Mesmo em app gratuito o Play Console pede o perfil para concluir o cadastro.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          title: 'Quem deve ser o dono da conta',
          text: `A conta é do provedor: ${c.legalName}. Ele paga, ele aparece como desenvolvedor na loja e ele fica com o app se a parceria acabar. Você entra convidado em Usuários e permissões, com acesso de administrador. É também o que evita, na Apple, a reprovação pela diretriz 4.2.6.`,
        },
        {
          kind: 'links',
          items: [
            { label: 'Criar conta no Play Console', url: 'https://play.google.com/console/signup' },
            {
              label: 'Requisito de teste para contas pessoais (12 testadores, 14 dias)',
              url: 'https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt-BR',
            },
            { label: 'Pedir o número D-U-N-S (Dun & Bradstreet)', url: 'https://www.dnb.com/pt-br/duns-number.html' },
          ],
        },
      ],
    },
    {
      id: 'play-2',
      title: 'Criar o app no Play Console',
      summary: 'Três campos, e dois deles não voltam atrás.',
      blocks: [
        {
          kind: 'fields',
          caption: 'Play Console › Todos os apps › Criar app',
          rows: [
            {
              field: 'Nome do app',
              value: c.appName,
              why: 'Até 30 caracteres. Dá para mudar depois, mas cada mudança volta para a revisão.',
            },
            {
              field: 'Idioma padrão',
              value: 'Português (Brasil) – pt-BR',
              why: 'Define o idioma da ficha principal. Não precisa de outro idioma para publicar só no Brasil.',
            },
            {
              field: 'App ou jogo',
              value: 'App',
              why: 'Muda a árvore de categorias e o questionário de classificação.',
            },
            {
              field: 'Gratuito ou pago',
              value: 'Gratuito',
              why: 'Não tem volta: um app gratuito nunca vira pago. O cliente paga a internet, não o app — gratuito é o correto.',
            },
            {
              field: 'Declarações',
              value: 'Marcar as duas: diretrizes do programa e leis de exportação dos EUA',
              why: 'Obrigatórias para criar o app.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          title: 'O identificador do pacote não muda nunca',
          text: `Este app envia ${c.packageId}. A loja trata pacote diferente como app diferente: mudar depois de publicar significa ficha nova, do zero, com os clientes antigos parados no app velho. O campo fica travado no painel assim que o primeiro pacote é assinado, justamente por isso.`,
        },
      ],
    },
    {
      id: 'play-3',
      title: 'Preencher a ficha da loja',
      summary: 'Textos e imagens que o cliente vê. Os textos prontos estão no fim desta página.',
      blocks: [
        {
          kind: 'fields',
          caption: 'Play Console › Crescer › Ficha principal da loja',
          rows: [
            { field: 'Nome do app', value: c.appName, why: 'Máximo de 30 caracteres.' },
            { field: 'Descrição breve', value: 'Texto pronto abaixo', why: 'Máximo de 80. É a linha que aparece na busca.' },
            { field: 'Descrição completa', value: 'Texto pronto abaixo', why: 'Máximo de 4.000. Alimenta a busca da Play.' },
            { field: 'Ícone', value: '512 × 512, PNG de 32 bits', why: 'Sai no ZIP de Marca & visual.' },
            { field: 'Imagem de destaque', value: '1024 × 500, JPEG ou PNG de 24 bits', why: 'Obrigatória, e a mais esquecida. Sem ela a ficha não publica.' },
            {
              field: 'Capturas de tela do celular',
              value: 'No mínimo 2; use as 4 ou mais do ZIP',
              why: 'Mínimo técnico é 2, mas apps com menos de 4 ficam de fora dos espaços de destaque da loja.',
            },
            { field: 'Vídeo', value: 'Deixe em branco', why: 'Opcional. Vídeo ruim converte pior que nenhum.' },
          ],
        },
        {
          kind: 'fields',
          caption: 'Play Console › Crescer › Configurações da loja',
          rows: [
            {
              field: 'Categoria do app',
              value: 'Produtividade',
              why: 'É onde moram as centrais de assinante das operadoras. "Ferramentas" também é aceita; a diferença prática é pequena.',
            },
            {
              field: 'Categoria "Finanças"',
              value: 'Não use',
              why: 'Puxa o app para as políticas de serviços financeiros — exigência de licença, comprovação de vínculo com instituição financeira e revisão mais dura. O app mostra fatura de internet, não presta serviço financeiro.',
            },
            { field: 'Tags', value: 'Até 5, dentro de Produtividade', why: 'Ajudam a Play a encaixar o app nas coleções.' },
            {
              field: 'E-mail de contato',
              value: c.supportEmail ?? '[cadastre em Configurações]',
              why: 'Fica público na ficha. Precisa ser um e-mail que a empresa lê.',
            },
            { field: 'Site', value: c.origin, why: 'O endereço da central do provedor.' },
            {
              field: 'Política de privacidade',
              value: 'URL pública, no domínio da empresa',
              why: 'Sem ela a revisão nem começa. O texto pronto está no fim desta página.',
            },
          ],
        },
        { kind: 'copy', copyId: 'play-breve' },
        { kind: 'copy', copyId: 'play-completa' },
        {
          kind: 'links',
          items: [
            {
              label: 'Especificação das imagens da ficha',
              url: 'https://support.google.com/googleplay/android-developer/answer/9866151?hl=pt-BR',
            },
          ],
        },
      ],
    },
    {
      id: 'play-4',
      title: 'Conteúdo do app — as declarações obrigatórias',
      summary: 'Oito formulários. Nenhum é opcional, e é aqui que a publicação trava.',
      blocks: [
        {
          kind: 'text',
          text:
            'Play Console › Políticas e programas › Conteúdo do app. A tela lista tudo com um selo verde quando conclui. Respostas por app, e valem para este tipo de central:',
        },
        {
          kind: 'fields',
          rows: [
            {
              field: 'Acesso ao app',
              value: 'Todas as funcionalidades são restritas → informar CPF e senha de teste',
              why: 'O revisor abre o app e cai no login. Sem credenciais que funcionem, a reprovação é certa. Texto pronto abaixo.',
            },
            {
              field: 'Anúncios',
              value: 'Não, o app não contém anúncios',
              why: 'Marcar "sim" sem ter anúncio coloca o selo "Contém anúncios" na ficha, o que assusta cliente à toa.',
            },
            {
              field: 'Classificação do conteúdo',
              value: 'Categoria "Utilitário, produtividade, comunicação ou outro" → responder Não a tudo → sai Livre / Everyone',
              why: 'O questionário é do IARC. Sem ele o app não sai do rascunho.',
            },
            {
              field: 'Público-alvo e conteúdo',
              value: 'Só a faixa 18 anos ou mais',
              why: 'Marcar qualquer faixa abaixo de 13 anos joga o app na Política de Famílias inteira: revisão de conteúdo infantil, exigências de publicidade, política de privacidade específica. O titular do contrato é adulto — marque 18+ e pule tudo isso.',
            },
            {
              field: 'App de notícias',
              value: 'Não',
              why: '',
            },
            {
              field: 'Apps de saúde',
              value: 'Não',
              why: '',
            },
            {
              field: 'Apps do governo',
              value: 'Não',
              why: 'É para app publicado por órgão público. Provedor privado marca não.',
            },
            {
              field: 'Recursos financeiros',
              value: 'Declarar que o app NÃO oferece nenhum dos recursos listados',
              why: 'O formulário é obrigatório para todo app, mesmo sem nada financeiro — o Google bloqueia atualização de quem não respondeu. As categorias são empréstimo pessoal, cripto, investimento, seguro, apostas e serviço bancário. Mostrar a fatura da própria empresa e o código Pix dela não é nenhuma delas: o app não intermedeia dinheiro de terceiros, não processa pagamento e não é instituição financeira.',
            },
            {
              field: 'Declarações de permissões sensíveis',
              value: 'Nada a declarar',
              why: 'O app não pede SMS, chamadas, localização em segundo plano nem acesso a arquivos. Quando o push entrar, entra só a permissão de notificação, que não é sensível.',
            },
          ],
        },
        { kind: 'copy', copyId: 'play-acesso' },
        {
          kind: 'links',
          items: [
            {
              label: 'Preparar o app para a revisão (acesso, público-alvo, declarações)',
              url: 'https://support.google.com/googleplay/android-developer/answer/9859455?hl=pt-BR',
            },
            {
              label: 'Classificação de conteúdo (IARC)',
              url: 'https://support.google.com/googleplay/android-developer/answer/9859655?hl=pt-BR',
            },
            {
              label: 'Declaração de recursos financeiros',
              url: 'https://support.google.com/googleplay/android-developer/answer/13849271?hl=pt-BR',
            },
          ],
        },
      ],
    },
    {
      id: 'play-5',
      title: 'Segurança dos dados — o formulário que dá multa se mentir',
      summary: 'Declaração errada tira o app do ar. Estas respostas descrevem a central como ela é hoje.',
      blocks: [
        {
          kind: 'note',
          tone: 'info',
          title: 'A regra que muda tudo: mostrar não é coletar',
          text:
            '"Coletar", para o Google, é o app tirar o dado do aparelho e mandar para fora. Nome, endereço e telefone aparecem na central, mas vêm do ERP para a tela — o app não os recolhe do cliente. Por isso a lista abaixo é curta. Declarar demais também é declaração imprecisa, e assusta o cliente na ficha.',
        },
        {
          kind: 'fields',
          caption: 'Play Console › Conteúdo do app › Segurança dos dados',
          rows: [
            { field: 'O app coleta ou compartilha algum dos tipos de dados exigidos?', value: 'Sim' },
            {
              field: 'Todos os dados são criptografados em trânsito?',
              value: 'Sim',
              why: 'A central é HTTPS ponta a ponta.',
            },
            {
              field: 'Você oferece um jeito de o usuário pedir a exclusão dos dados?',
              value: `Sim → URL: ${c.origin}/suporte`,
              why: 'O Google exige uma URL, e não aceita apenas um e-mail. A página de suporte da central serve.',
            },
            {
              field: 'Dados pessoais › IDs do usuário',
              value: 'Coletado · Não compartilhado · Obrigatório · Funcionalidade do app e Gerenciamento de conta',
              why: 'É o CPF ou CNPJ digitado no login.',
            },
            {
              field: 'Mensagens › Outras mensagens no app',
              value: 'Coletado · Não compartilhado · Opcional · Funcionalidade do app e Suporte ao cliente',
              why: 'O assunto e o texto do chamado que o cliente abre na aba Suporte.',
            },
            {
              field: 'Informações financeiras',
              value: 'Não declarar',
              why: 'A fatura vai do servidor para a tela; o app não a coleta. E o pagamento acontece no aplicativo do banco, fora daqui — o app nunca vê dado de cartão.',
            },
            {
              field: 'Local, contatos, fotos, arquivos, agenda, áudio',
              value: 'Nada',
              why: 'O app não pede nenhuma dessas permissões.',
            },
            {
              field: 'Registros de falha e diagnóstico',
              value: 'Não declarar',
              why: 'Não há SDK de crash nem de analytics dentro do app.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          title: 'Volte aqui quando ligar o push',
          text:
            'A notificação de fatura registra o dispositivo do assinante no servidor. No dia em que isso entrar, some "IDs do dispositivo" à declaração. Se um dia entrar Google Analytics, Firebase ou qualquer SDK de medição, a lista cresce de novo — e ficha desatualizada é motivo de remoção, não de aviso.',
        },
        {
          kind: 'links',
          items: [
            {
              label: 'Como preencher a seção Segurança dos dados',
              url: 'https://support.google.com/googleplay/android-developer/answer/10787469?hl=pt-BR',
            },
          ],
        },
      ],
    },
    {
      id: 'play-6',
      title: 'Enviar o pacote — teste interno antes da produção',
      summary: 'O .aab sai da aba Aplicativo. O primeiro envio vai para o teste interno, sempre.',
      blocks: [
        {
          kind: 'checks',
          items: [
            {
              id: 'play-6-build',
              text: 'Gerar o pacote na aba Aplicativo e baixar o .aab',
              detail: 'Leva de 5 a 10 minutos. O painel avisa quando termina.',
            },
            {
              id: 'play-6-interno',
              text: 'Play Console › Teste › Teste interno › Criar versão › enviar o .aab',
              detail:
                'Libera em minutos, aceita até 100 testadores por e-mail e instala pela loja de verdade. É onde se descobre ícone errado, nome cortado e login quebrado — antes de a revisão ver.',
            },
            {
              id: 'play-6-instalar',
              text: 'Instalar no seu aparelho pelo link de teste e entrar com o cliente de teste',
              detail: 'Confira: ícone, nome sob o ícone, cor da barra do sistema, login, fatura, Pix e o botão de voltar.',
            },
            {
              id: 'play-6-assinatura',
              text: 'Aceitar o Play App Signing no primeiro envio',
              detail:
                'O Google reassina o pacote com a chave dele. É o padrão e é o que permite recuperar a publicação se a chave de upload se perder.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          title: 'Nível de API',
          text:
            'Desde 31/08/2025 a Play exige Android 15 (API 35) e, a partir de 31/08/2026, novos envios precisam de Android 16 (API 36). O gerador do painel acompanha; se um envio for recusado por isso, é bump de uma linha no Bubblewrap, não retrabalho.',
        },
        {
          kind: 'links',
          items: [
            {
              label: 'Requisitos de nível da API de destino',
              url: 'https://support.google.com/googleplay/android-developer/answer/11926878?hl=pt-BR',
            },
          ],
        },
      ],
    },
    {
      id: 'play-7',
      title: 'Publicar na produção',
      summary: 'Com tudo verde no painel de configuração, a produção é um clique — e uma espera.',
      blocks: [
        {
          kind: 'checks',
          items: [
            {
              id: 'play-7-paises',
              text: 'Produção › Países e regiões › Brasil',
              detail: 'Publicar no mundo inteiro não traz cliente e amplia o risco de exigência de outro país.',
            },
            {
              id: 'play-7-versao',
              text: 'Criar a versão de produção com o mesmo .aab e as novidades desta versão',
            },
            {
              id: 'play-7-revisao',
              text: 'Enviar para revisão e esperar',
              detail:
                'De algumas horas a 7 dias. O primeiro app de uma conta nova costuma demorar mais; as atualizações seguintes saem rápido.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'danger',
          title: 'Assim que sair na loja, faça este passo',
          text: `Play Console › Configuração › Integridade do app: copie a impressão digital SHA-256 do certificado do Play App Signing e cole no campo da aba Aplicativo. Sem isso o app abre com a barra de endereço do navegador em cima da tela — a falha número um deste tipo de app. Depois de salvar, confira ${c.origin}/.well-known/assetlinks.json e reinstale o app para o Android buscar a verificação de novo.`,
        },
      ],
    },
    {
      id: 'play-8',
      title: 'Depois de publicado',
      summary: 'O que exige nova versão e o que não exige.',
      blocks: [
        {
          kind: 'note',
          tone: 'success',
          title: 'A vantagem de ser TWA',
          text:
            'Tela nova, texto novo, correção de bug na central: sobe na Vercel e o app de todo mundo já está atualizado, sem passar por revisão de loja. Só voltam ao Play Console: mudança de ícone, de nome, de cor da barra do sistema e o nível de API obrigatório.',
        },
        {
          kind: 'checks',
          items: [
            {
              id: 'play-8-backup',
              text: 'Guardar um backup da chave de assinatura',
              detail:
                'A chave nasce no primeiro build e fica cifrada no banco. Perder o banco sem backup é perder a capacidade de atualizar o app publicado.',
            },
            {
              id: 'play-8-avisos',
              text: 'Deixar o e-mail da conta como um que a empresa leia todo dia',
              detail:
                'É por ali que chegam avisos de política com prazo. Aviso ignorado vira app removido, e voltar é bem mais trabalhoso do que atender no prazo.',
            },
          ],
        },
      ],
    },
  ];
}

export function appleSteps(c: StoreCopyContext): GuideStep[] {
  return [
    {
      id: 'apple-1',
      title: 'Antes de tudo: o app precisa deixar de ser só um site',
      summary: 'A diretriz 4.2 é a razão pela qual centrais de provedor são reprovadas na Apple.',
      blocks: [
        {
          kind: 'note',
          tone: 'danger',
          title: 'Não submeta ainda',
          text:
            'A Apple reprova app que é um site dentro de uma casca — diretriz 4.2, Funcionalidade mínima. O revisor abre, reconhece uma página web e recusa; mexer no layout para disfarçar não muda o resultado. O que muda é recurso nativo de verdade. No projeto de hoje isso ainda não existe, e submeter antes queima o primeiro envio, que é o mais bem examinado de todos.',
        },
        {
          kind: 'text',
          text: 'O que precisa estar pronto antes do primeiro envio, em ordem de peso na revisão:',
        },
        {
          kind: 'checks',
          items: [
            {
              id: 'apple-1-push',
              text: 'Notificação de fatura (emitida, vencendo, vencida)',
              detail:
                'O argumento mais forte, e o recurso que os assinantes mais pedem. Sem ele eu não submeteria.',
            },
            {
              id: 'apple-1-biometria',
              text: 'Entrada por Face ID ou Touch ID',
              detail: 'Segundo recurso nativo, barato de implementar e fácil de o revisor ver funcionando.',
            },
            {
              id: 'apple-1-offline',
              text: 'Última fatura e código Pix disponíveis offline',
              detail: 'Responde direto ao "isto poderia ser um site": site não abre sem internet.',
            },
            {
              id: 'apple-1-deeplink',
              text: 'Deep links abrindo a fatura dentro do app',
              detail: 'O apple-app-site-association, no mesmo esquema por domínio que o Android já usa.',
            },
          ],
        },
        {
          kind: 'links',
          items: [
            { label: 'Diretrizes da App Review (4.2 Funcionalidade mínima)', url: 'https://developer.apple.com/app-store/review/guidelines/' },
          ],
        },
      ],
    },
    {
      id: 'apple-2',
      title: 'Abrir a conta — na Apple, quem publica importa',
      summary: 'A diretriz 4.2.6 decide de quem tem que ser a conta. Errar aqui derruba o app.',
      blocks: [
        {
          kind: 'note',
          tone: 'danger',
          title: 'A conta é do provedor, não sua',
          text: `A diretriz 4.2.6 recusa apps saídos de gerador quando enviados pela conta do fornecedor da ferramenta. O texto da própria Apple diz que esses serviços devem deixar o cliente publicar. Então a conta é da ${c.legalName}, ela paga os US$ 99 por ano, e você entra como desenvolvedor autorizado em Users and Access. Publicar vários provedores por uma conta de agência funciona nos primeiros e vira remoção em lote quando o volume aparece.`,
        },
        {
          kind: 'checks',
          items: [
            {
              id: 'apple-2-duns',
              text: 'Conseguir o D-U-N-S da empresa',
              detail:
                'A Apple exige para conta de organização e tem uma busca própria: se a empresa já tem número, ele aparece ali. Razão social e endereço precisam bater com o CNPJ.',
            },
            {
              id: 'apple-2-enroll',
              text: 'Inscrever a empresa no Apple Developer Program (US$ 99/ano)',
              detail:
                'Quem se inscreve precisa ter poderes para assinar pela empresa. A Apple confirma isso por ligação — leva de dias a algumas semanas, então comece cedo.',
            },
            {
              id: 'apple-2-trader',
              text: 'Decidir sobre o status de comerciante (trader status)',
              detail:
                'Exigência do Digital Services Act: app sem status de comerciante verificado sai da App Store da União Europeia. Publicando só no Brasil, o assunto não aparece — e é mais um motivo para restringir os países na hora do envio.',
            },
          ],
        },
        {
          kind: 'links',
          items: [
            { label: 'Inscrição no Apple Developer Program', url: 'https://developer.apple.com/programs/enroll/' },
            { label: 'Busca de D-U-N-S da Apple', url: 'https://developer.apple.com/enroll/duns-lookup/' },
          ],
        },
      ],
    },
    {
      id: 'apple-3',
      title: 'Preparar o projeto no Xcode',
      summary: 'O painel entrega o projeto pronto; o Mac faz o resto.',
      blocks: [
        {
          kind: 'note',
          tone: 'warning',
          title: 'Xcode 26 ou mais novo',
          text:
            'Desde 28/04/2026 o App Store Connect só aceita binário compilado com o Xcode 26 e o SDK do iOS 26. Xcode antigo dá erro no envio, depois de todo o trabalho de arquivar — atualize antes de começar.',
        },
        {
          kind: 'text',
          text: 'Baixe o projeto na aba Aplicativo ("Baixar projeto iOS") e, no Mac:',
        },
        {
          kind: 'checks',
          items: [
            {
              id: 'apple-3-build',
              text: 'npm install → npx cap add ios → npx capacitor-assets generate --ios → npx cap sync ios → npx cap open ios',
              detail: 'O passo a passo completo vem no LEIA-ME do zip.',
            },
            {
              id: 'apple-3-signing',
              text: 'Signing & Capabilities: escolher o time de desenvolvimento do provedor',
              detail: `O bundle identifier já vem preenchido: ${c.packageId}. Ele é imutável depois da publicação, igual ao Android.`,
            },
            {
              id: 'apple-3-encryption',
              text: 'Adicionar ITSAppUsesNonExemptEncryption = NO no Info.plist',
              detail:
                'Sem essa chave, todo envio para o TestFlight para e pergunta sobre exportação de criptografia. O app só usa HTTPS, que é criptografia isenta — a chave responde a pergunta de uma vez.',
            },
            {
              id: 'apple-3-archive',
              text: 'Destino "Any iOS Device" › Product › Archive › Distribute App',
              detail: 'Simulador não gera arquivo distribuível — se a opção Archive estiver apagada, é o destino errado.',
            },
          ],
        },
        {
          kind: 'links',
          items: [
            { label: 'Requisitos de SDK e prazos da Apple', url: 'https://developer.apple.com/news/upcoming-requirements/' },
          ],
        },
      ],
    },
    {
      id: 'apple-4',
      title: 'Criar o app no App Store Connect e preencher a ficha',
      summary: 'Campos diferentes dos da Play, com limites menores. Textos prontos no fim da página.',
      blocks: [
        {
          kind: 'fields',
          caption: 'App Store Connect › Meus apps › + › Novo app',
          rows: [
            { field: 'Plataforma', value: 'iOS' },
            { field: 'Nome', value: c.appName, why: 'Máximo de 30 caracteres, único na App Store inteira. Nome tomado, some a cidade ou "Internet".' },
            { field: 'Idioma principal', value: 'Português (Brasil)' },
            { field: 'Bundle ID', value: c.packageId, why: 'O mesmo do projeto do Xcode.' },
            { field: 'SKU', value: c.packageId, why: 'Código interno, nunca aparece para o cliente. Repetir o bundle é o mais simples.' },
          ],
        },
        {
          kind: 'fields',
          caption: 'Ficha da versão',
          rows: [
            { field: 'Subtítulo', value: 'Texto pronto abaixo', why: 'Até 30 caracteres, e conta na busca tanto quanto o nome.' },
            { field: 'Palavras-chave', value: 'Texto pronto abaixo', why: 'Até 100 caracteres no total, separadas por vírgula sem espaço.' },
            { field: 'Descrição', value: 'Texto pronto abaixo', why: 'Até 4.000 caracteres. A Apple não indexa a descrição: ela é para o cliente.' },
            { field: 'Texto promocional', value: 'Texto pronto abaixo', why: 'Até 170 caracteres, e muda sem enviar versão nova.' },
            {
              field: 'Capturas de tela — iPhone 6,9"',
              value: '1320 × 2868, de 1 a 10 imagens',
              why: 'É o único tamanho de iPhone obrigatório hoje: a Apple reduz sozinha para as telas menores. Sai pronto no ZIP de Marca & visual.',
            },
            {
              field: 'Capturas de tela — iPad 13"',
              value: 'Só se marcar suporte a iPad',
              why: 'Se não vai manter versão de iPad, desmarque o iPad no projeto e o campo some.',
            },
            { field: 'Ícone', value: '1024 × 1024, dentro do projeto do Xcode', why: 'Diferente da Play: aqui o ícone sobe no binário, não na ficha.' },
            {
              field: 'Categoria principal',
              value: 'Produtividade',
              why: 'Utilitários também serve. Fuja de Finanças: joga o app nas regras de apps financeiros sem nenhum ganho.',
            },
            { field: 'Categoria secundária', value: 'Utilitários' },
            { field: 'URL de suporte', value: `${c.origin}/suporte`, why: 'Campo obrigatório, precisa abrir de verdade.' },
            { field: 'URL de marketing', value: c.origin, why: 'Opcional.' },
            { field: 'Política de privacidade', value: 'A mesma URL usada na Play', why: 'Obrigatória.' },
            { field: 'Preço', value: 'Gratuito', why: 'Sem compras no app.' },
            {
              field: 'Disponibilidade',
              value: 'Somente Brasil',
              why: 'Evita a exigência de status de comerciante da União Europeia e reduz a superfície de regras estrangeiras.',
            },
          ],
        },
        { kind: 'copy', copyId: 'apple-subtitulo' },
        { kind: 'copy', copyId: 'apple-keywords' },
        { kind: 'copy', copyId: 'apple-descricao' },
        {
          kind: 'links',
          items: [
            {
              label: 'Tamanhos de captura de tela aceitos',
              url: 'https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/',
            },
          ],
        },
      ],
    },
    {
      id: 'apple-5',
      title: 'Classificação etária e privacidade',
      summary: 'Dois questionários. O de idade mudou em 2026 e trava o envio de quem não respondeu.',
      blocks: [
        {
          kind: 'note',
          tone: 'warning',
          title: 'A classificação etária mudou',
          text:
            'Desde 31/01/2026 vale o questionário novo, com as faixas 13+, 16+ e 18+ somadas às antigas 4+ e 9+, e perguntas novas sobre controles no app, recursos e temas sensíveis. App que não respondeu o questionário novo fica bloqueado para envio e para atualização.',
        },
        {
          kind: 'fields',
          caption: 'App Store Connect › Informações do app › Classificação etária',
          rows: [
            { field: 'Violência, sexo, drogas, jogos de azar, linguagem', value: 'Nenhum / Não a todas', why: 'A central não tem nada disso.' },
            { field: 'Acesso irrestrito à web', value: 'Não', why: 'O app abre apenas o domínio do provedor, não é navegador.' },
            { field: 'Recursos de rede social ou mensagens entre usuários', value: 'Não', why: 'O chamado de suporte vai para a empresa, não é conversa entre clientes.' },
            { field: 'Resultado esperado', value: '4+' },
          ],
        },
        {
          kind: 'fields',
          caption: 'App Store Connect › Privacidade do app (as etiquetas de privacidade)',
          rows: [
            {
              field: 'Identificadores › ID do usuário',
              value: 'Coletado · Vinculado ao usuário · Funcionalidade do app',
              why: 'O CPF ou CNPJ do login.',
            },
            {
              field: 'Conteúdo do usuário › Suporte ao cliente',
              value: 'Coletado · Vinculado ao usuário · Funcionalidade do app',
              why: 'O texto dos chamados abertos na aba Suporte.',
            },
            {
              field: 'Informações de contato e financeiras',
              value: 'Não declarar',
              why: 'Aparecem na tela vindas do ERP; o app não as recolhe do aparelho. Para a Apple, como para o Google, mostrar não é coletar.',
            },
            {
              field: 'Rastreamento (App Tracking Transparency)',
              value: 'Não',
              why: 'Nada é usado para publicidade nem cruzado com dados de terceiros. Marcando não, o app nem precisa pedir permissão de rastreamento.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          title: 'Sobre exclusão de conta (diretriz 5.1.1)',
          text:
            'Quem deixa criar conta dentro do app é obrigado a deixar excluir dentro do app. A central não cria conta: o cadastro nasce do contrato, no ERP. Diga isso nas notas da revisão — o texto pronto já traz a explicação — e deixe o caminho de exclusão na política de privacidade.',
        },
        {
          kind: 'links',
          items: [
            { label: 'Anúncio oficial da nova classificação etária', url: 'https://developer.apple.com/news/?id=ks775ehf' },
          ],
        },
      ],
    },
    {
      id: 'apple-6',
      title: 'Informações para a revisão',
      summary: 'O campo mais subestimado do App Store Connect — e o que decide o primeiro envio.',
      blocks: [
        {
          kind: 'text',
          text:
            'Em App Store Connect › a versão › Informações da revisão do app. O revisor é uma pessoa com poucos minutos por app e nenhuma familiaridade com provedor de internet brasileiro. Um texto que já responde as três diretrizes de risco muda a taxa de aprovação de primeira.',
        },
        {
          kind: 'checks',
          items: [
            {
              id: 'apple-6-demo',
              text: 'Marcar "É necessário fazer login" e preencher CPF e senha de teste',
              detail:
                'Diretriz 2.1: envio com login sem conta de demonstração é rejeitado sem análise. Confirme que a conta funciona no dia do envio, e mantenha as faturas de exemplo com dados plausíveis.',
            },
            {
              id: 'apple-6-notas',
              text: 'Colar as notas da revisão (texto pronto abaixo)',
            },
            {
              id: 'apple-6-contato',
              text: 'Preencher telefone e e-mail de contato de alguém que responda',
              detail: 'A Apple usa isso quando tem dúvida. Responder rápido encurta muito uma reprovação.',
            },
          ],
        },
        { kind: 'copy', copyId: 'apple-revisao' },
      ],
    },
    {
      id: 'apple-7',
      title: 'TestFlight e envio',
      summary: 'Sempre TestFlight antes. É onde os erros aparecem de graça.',
      blocks: [
        {
          kind: 'checks',
          items: [
            {
              id: 'apple-7-testflight',
              text: 'Enviar o build e testar pelo TestFlight no iPhone de verdade',
              detail:
                'Um .ipa de App Store não instala direto no aparelho — o caminho é o TestFlight. O build leva alguns minutos processando antes de aparecer.',
            },
            {
              id: 'apple-7-conferir',
              text: 'Conferir no aparelho: login, fatura, Pix, boleto, suporte e a área segura da tela',
              detail: 'Preste atenção no topo e no rodapé: conteúdo por baixo do notch ou da barra inferior é reprovação por diretriz de design.',
            },
            {
              id: 'apple-7-enviar',
              text: 'Adicionar o build à versão e enviar para revisão',
              detail:
                'A revisão costuma responder em 24 a 48 horas. O primeiro envio de uma conta nova pode demorar mais.',
            },
          ],
        },
      ],
    },
    {
      id: 'apple-8',
      title: 'Se for recusado',
      summary: 'Recusa é conversa, não sentença. O que fazer em cada motivo comum.',
      blocks: [
        {
          kind: 'fields',
          rows: [
            {
              field: '4.2 Funcionalidade mínima',
              value: 'Responder no Resolution Center mostrando os recursos nativos, com print e passo a passo',
              why: 'Se push e biometria já estiverem no app, diga em que tela ficam e como reproduzir. Se ainda não estiverem, não discuta: implemente e reenvie.',
            },
            {
              field: '4.2.6 App de gerador',
              value: 'Provar que quem envia é o dono do conteúdo',
              why: 'Conta no CNPJ do provedor, marca própria, domínio próprio e conteúdo exclusivo dos assinantes dele. Se a conta for de agência, não há resposta que resolva — mude a conta.',
            },
            {
              field: '2.1 Falta de informação',
              value: 'Corrigir a conta de demonstração e reenviar',
              why: 'Quase sempre é senha errada, cliente de teste sem fatura, ou o ERP fora do ar na hora da revisão.',
            },
            {
              field: '3.1.1 Compras no app',
              value: 'Explicar que a cobrança é de serviço do mundo real',
              why: 'Internet banda larga é serviço físico prestado na casa do assinante, previsto na diretriz 3.1.3(e), e o pagamento acontece fora do app, no banco do cliente. O texto pronto das notas de revisão já traz esse parágrafo.',
            },
            {
              field: '5.1.1 Privacidade',
              value: 'Verificar se a URL abre e se o texto cobre o que o app faz',
              why: 'Link quebrado e política genérica de modelo são os dois motivos mais comuns.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          title: 'Como responder',
          text:
            'Responda pelo Resolution Center, no mesmo dia, com objetividade e sem discutir a diretriz: descreva o que foi corrigido, onde ver e como reproduzir. Se a recusa for engano do revisor, dá para pedir revisão do caso pelo App Review Board — mas só depois de tentar a conversa normal.',
        },
      ],
    },
  ];
}

export function stepsFor(store: GuideStore, c: StoreCopyContext) {
  return store === 'play' ? playSteps(c) : appleSteps(c);
}

/** Documentação oficial — a fonte para conferir quando a loja mudar as regras. */
export const OFFICIAL_LINKS: Record<GuideStore, { label: string; url: string }[]> = {
  play: [
    { label: 'Play Console', url: 'https://play.google.com/console' },
    { label: 'Central de políticas do desenvolvedor', url: 'https://play.google/developer-content-policy/' },
    {
      label: 'Preparar o app para a revisão',
      url: 'https://support.google.com/googleplay/android-developer/answer/9859455?hl=pt-BR',
    },
    {
      label: 'Segurança dos dados',
      url: 'https://support.google.com/googleplay/android-developer/answer/10787469?hl=pt-BR',
    },
    {
      label: 'Declaração de recursos financeiros',
      url: 'https://support.google.com/googleplay/android-developer/answer/13849271?hl=pt-BR',
    },
    {
      label: 'Nível da API de destino',
      url: 'https://support.google.com/googleplay/android-developer/answer/11926878?hl=pt-BR',
    },
    {
      label: 'Teste para contas pessoais novas',
      url: 'https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt-BR',
    },
    { label: 'Trusted Web Activity (documentação do Chrome)', url: 'https://developer.chrome.com/docs/android/trusted-web-activity/' },
  ],
  apple: [
    { label: 'App Store Connect', url: 'https://appstoreconnect.apple.com/' },
    { label: 'Diretrizes da App Review', url: 'https://developer.apple.com/app-store/review/guidelines/' },
    { label: 'Ajuda do App Store Connect', url: 'https://developer.apple.com/help/app-store-connect/' },
    { label: 'Prazos e requisitos em vigor', url: 'https://developer.apple.com/news/upcoming-requirements/' },
    { label: 'Nova classificação etária', url: 'https://developer.apple.com/news/?id=ks775ehf' },
    {
      label: 'Tamanhos de captura de tela',
      url: 'https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/',
    },
    { label: 'Inscrição no Apple Developer Program', url: 'https://developer.apple.com/programs/enroll/' },
  ],
};
