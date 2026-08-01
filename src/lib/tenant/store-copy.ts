import type { Tenant } from '@/lib/supabase/types';
import type { TenantApp } from './app-config';
import { tenantOrigin } from './app-config';

// Textos prontos da ficha das lojas, já com o nome e os contatos do provedor.
//
// Cada bloco existe porque um campo da loja pede exatamente aquilo, com o
// limite de caracteres que a loja aplica — por isso o `limit`: o painel conta
// na tela e o provedor vê que estourou antes de o console recusar.
//
// A regra que guiou a redação: descrever só o que a central faz de verdade.
// Ficha que promete o que o app não tem é reprovação na revisão das duas
// lojas, e é a forma mais boba de perder duas semanas.

export interface CopyBlock {
  id: string;
  label: string;
  hint?: string;
  /** Limite de caracteres do campo na loja, quando existe. */
  limit?: number;
  text: string;
}

export interface StoreCopyContext {
  name: string;
  legalName: string;
  cnpj: string | null;
  origin: string;
  appName: string;
  packageId: string;
  supportEmail: string | null;
  supportPhone: string | null;
  supportWhatsapp: string | null;
  /** Data de hoje em pt-BR, para carimbar a política de privacidade. */
  today: string;
}

export function copyContext(tenant: Tenant, app: TenantApp): StoreCopyContext {
  return {
    name: tenant.name,
    legalName: tenant.legal_name ?? tenant.name,
    cnpj: tenant.cnpj,
    origin: tenantOrigin(tenant),
    appName: app.app_name,
    packageId: app.package_id,
    supportEmail: tenant.support_email,
    supportPhone: tenant.support_phone,
    supportWhatsapp: tenant.support_whatsapp,
    today: new Date().toLocaleDateString('pt-BR'),
  };
}

/** Como a descrição fala dos canais de atendimento que o provedor tem. */
function canaisNaDescricao(c: StoreCopyContext) {
  if (c.supportWhatsapp && c.supportPhone) return `o WhatsApp e o telefone da ${c.name} a um toque`;
  if (c.supportWhatsapp) return `o WhatsApp da ${c.name} a um toque`;
  if (c.supportPhone) return `o telefone da ${c.name} a um toque`;
  return `os canais de atendimento da ${c.name} a um toque`;
}

function blocoDeContatos(c: StoreCopyContext) {
  const linhas: string[] = [];
  if (c.supportEmail) linhas.push(c.supportEmail);
  if (c.supportWhatsapp) linhas.push(`WhatsApp ${c.supportWhatsapp}`);
  if (c.supportPhone) linhas.push(c.supportPhone);
  linhas.push(c.origin.replace(/^https?:\/\//, ''));
  return linhas.join('\n');
}

/** E-mail que vai nos textos jurídicos — sem contato cadastrado, vira um aviso. */
function emailOuAviso(c: StoreCopyContext) {
  return c.supportEmail ?? '[cadastre o e-mail de suporte em Configurações]';
}

function descricaoCompleta(c: StoreCopyContext) {
  return `Central do Cliente ${c.name}: as faturas, o código Pix e o suporte da sua internet, no celular.

Este é o aplicativo oficial da ${c.name} para quem já é assinante. Entre com o CPF ou o CNPJ do titular do contrato e resolva em segundos o que antes precisava de uma ligação.

O QUE VOCÊ FAZ AQUI

• Faturas — veja o que está em aberto, o que já foi pago e o que venceu, com valor e data de vencimento.
• Pague por Pix — copie o código Pix da fatura e conclua o pagamento no aplicativo do seu banco.
• 2ª via do boleto — copie a linha digitável ou baixe o PDF para pagar onde preferir.
• Nota fiscal — baixe a NFS-e do mês.
• Seu plano — velocidade contratada, valor da mensalidade e dia do vencimento.
• Sua conexão — acompanhe a situação do seu acesso.
• Suporte — soluções rápidas para os problemas mais comuns e, quando não resolverem, ${canaisNaDescricao(c)}.
• Seus dados — endereço de instalação e dados cadastrais sempre à mão.

PARA QUEM É

Para assinantes da ${c.name}. O acesso é feito com o CPF ou o CNPJ do titular do contrato: não é preciso criar cadastro, porque a conta já existe desde a contratação.

FALE COM A GENTE

${blocoDeContatos(c)}`;
}

/** A descrição breve tem 80 caracteres — com nome comprido, o genérico salva. */
function descricaoBreve(c: StoreCopyContext) {
  const comMarca = `Faturas, Pix, 2ª via e suporte da ${c.name} na palma da mão.`;
  return comMarca.length <= 80 ? comMarca : 'Suas faturas, o código Pix e o suporte da sua internet na palma da mão.';
}

function politicaDePrivacidade(c: StoreCopyContext) {
  const email = emailOuAviso(c);
  const identificacao = c.cnpj
    ? `${c.legalName}, inscrita no CNPJ sob o nº ${c.cnpj}`
    : `${c.legalName} [complete com o CNPJ]`;

  return `POLÍTICA DE PRIVACIDADE — APLICATIVO ${c.appName.toUpperCase()}

Última atualização: ${c.today}

1. QUEM TRATA SEUS DADOS

${identificacao} ("${c.name}", "nós") é a controladora dos dados pessoais tratados neste aplicativo, nos termos da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados). Contato: ${email}.

2. O QUE O APLICATIVO FAZ

O aplicativo é a central de relacionamento dos assinantes da ${c.name}. Ele mostra, ao titular do contrato já cadastrado, as faturas do serviço de internet, o código Pix e a linha digitável para pagamento, a nota fiscal, o plano contratado, os dados cadastrais e os canais de atendimento.

3. DADOS QUE TRATAMOS

a) Dados de cadastro, que já existem no nosso sistema de gestão por causa do contrato: nome, CPF ou CNPJ, endereço de instalação, telefone e e-mail.
b) Dados do contrato: plano contratado, faturas, pagamentos, notas fiscais e situação da conexão.
c) Dados de acesso: o CPF ou CNPJ informado no login, a data e a hora do acesso e as informações técnicas necessárias para manter a sessão segura.
d) Dados que você nos envia: o assunto e a descrição dos chamados de suporte abertos no aplicativo.

O aplicativo não acessa sua localização, sua câmera, seus contatos, suas fotos, seu microfone nem suas mensagens.

4. PARA QUE USAMOS

- Executar o contrato de prestação do serviço de internet (art. 7º, V, da LGPD): apresentar faturas, emitir 2ª via, disponibilizar a nota fiscal e prestar atendimento.
- Cumprir obrigações legais e regulatórias (art. 7º, II), inclusive as fiscais e as da Anatel.
- Garantir a segurança do acesso e prevenir fraude (art. 7º, IX).

Não usamos seus dados para publicidade e não vendemos seus dados a ninguém.

5. COM QUEM COMPARTILHAMOS

Apenas com quem é necessário para o serviço funcionar: o sistema de gestão (ERP) da ${c.name}, a empresa que hospeda o aplicativo, a instituição financeira que emite os boletos e recebe os pagamentos e, quando houver obrigação legal, as autoridades públicas competentes. Todos ficam obrigados a tratar os dados apenas para essas finalidades.

6. PAGAMENTOS

O aplicativo não processa pagamentos. Ele apresenta o código Pix e a linha digitável emitidos pela ${c.name}, e o pagamento é concluído no aplicativo do seu banco. Não coletamos nem armazenamos dados de cartão de crédito.

7. POR QUANTO TEMPO GUARDAMOS

Enquanto durar o contrato e, depois disso, pelos prazos de guarda exigidos pela legislação fiscal, tributária e de telecomunicações.

8. SEUS DIREITOS

Você pode pedir confirmação do tratamento, acesso aos dados, correção, anonimização, portabilidade, informação sobre com quem compartilhamos e, quando cabível, a eliminação dos seus dados. Peça pelo ${email} ou pela central de atendimento em ${c.origin}/suporte. Respondemos em até 15 dias.

Os dados necessários ao contrato e à emissão de documentos fiscais não podem ser eliminados enquanto houver contrato vigente ou prazo legal de guarda em curso.

9. SEGURANÇA

O tráfego entre o aplicativo e nossos servidores é criptografado (HTTPS/TLS). O acesso aos dados é restrito ao titular do contrato autenticado e aos funcionários autorizados da ${c.name}.

10. CRIANÇAS E ADOLESCENTES

O aplicativo é destinado ao titular do contrato, maior de 18 anos. Não coletamos dados de crianças ou adolescentes de forma intencional.

11. EXCLUSÃO DA CONTA E DOS DADOS

O aplicativo não cria contas: o acesso usa o cadastro que já existe por causa do contrato. Para pedir a exclusão dos dados que não estejamos obrigados a guardar, escreva para ${email} ou acesse ${c.origin}/suporte.

12. MUDANÇAS NESTA POLÍTICA

Podemos atualizar esta política. A versão vigente fica sempre publicada em ${c.origin} e a data no topo indica a última alteração.

13. ENCARREGADO PELO TRATAMENTO DE DADOS (DPO)

${email}`;
}

function notasParaRevisaoApple(c: StoreCopyContext) {
  return `SOBRE O APP

A ${c.name} é um provedor de internet banda larga no Brasil. Este aplicativo é a central de relacionamento dos assinantes da própria empresa: o cliente entra com o CPF do titular do contrato e consulta as faturas do serviço, copia o código Pix para pagar no banco, baixa a 2ª via do boleto e a nota fiscal, acompanha o plano contratado e fala com o suporte.

CONTA DE DEMONSTRAÇÃO (diretriz 2.1)

CPF: [informe um CPF de teste com faturas de exemplo]
Senha: [informe a senha]

Não existe tela de cadastro no aplicativo: as contas são criadas pela ${c.name} a partir do sistema de gestão da empresa, no momento da contratação do serviço. A conta acima é uma conta real de teste e mostra todas as funcionalidades do app.

SOBRE A DIRETRIZ 3.1.1 (compras no app)

O aplicativo não vende conteúdo digital. As faturas exibidas cobram o serviço de internet banda larga prestado fisicamente na residência do assinante — bem e serviço do mundo real, previsto na diretriz 3.1.3(e). O pagamento acontece fora do aplicativo, no aplicativo do banco do usuário, por Pix ou boleto bancário, meios regulados pelo Banco Central do Brasil. O aplicativo não processa pagamentos.

SOBRE A DIRETRIZ 4.2 (funcionalidade mínima)

O aplicativo usa recursos nativos do iPhone: notificações push quando a fatura é emitida, quando está próxima do vencimento e quando fica em atraso; entrada por Face ID ou Touch ID; e acesso offline à última fatura e ao código Pix.

SOBRE A DIRETRIZ 4.2.6

O aplicativo é enviado pela conta de desenvolvedor da própria ${c.legalName}, dona do conteúdo, da marca e do relacionamento com os assinantes.`;
}

function instrucoesDeAcessoPlay(c: StoreCopyContext) {
  return `Todo o conteúdo do aplicativo exige login de assinante da ${c.name}.

Usuário (CPF do titular): [informe um CPF de teste]
Senha: [informe a senha]

Não há tela de cadastro: as contas são criadas pela ${c.name} a partir do sistema de gestão da empresa, no momento da contratação do serviço de internet.`;
}

export interface StoreCopySet {
  play: CopyBlock[];
  apple: CopyBlock[];
  comum: CopyBlock[];
}

export function buildStoreCopy(c: StoreCopyContext): StoreCopySet {
  const descricao = descricaoCompleta(c);

  return {
    play: [
      {
        id: 'play-nome',
        label: 'Nome do app',
        hint: 'Play Console › Ficha principal da loja. É o que aparece embaixo do ícone.',
        limit: 30,
        text: c.appName,
      },
      {
        id: 'play-breve',
        label: 'Descrição breve',
        hint: 'A única linha que aparece na busca antes de o cliente tocar no app.',
        limit: 80,
        text: descricaoBreve(c),
      },
      {
        id: 'play-completa',
        label: 'Descrição completa',
        hint: 'As três primeiras linhas são o que a maioria lê. O resto ajuda a busca da Play.',
        limit: 4000,
        text: descricao,
      },
      {
        id: 'play-acesso',
        label: 'Instruções de acesso (App access)',
        hint: 'Play Console › Conteúdo do app › Acesso ao app. Sem isso, o revisor trava no login e reprova.',
        text: instrucoesDeAcessoPlay(c),
      },
      {
        id: 'play-novidades',
        label: 'Novidades desta versão',
        hint: 'Vai na versão, não na ficha. Na primeira publicação, descreva o app.',
        limit: 500,
        text: `Primeira versão do aplicativo da ${c.name}: faturas, código Pix, 2ª via do boleto, nota fiscal, plano contratado e canal direto com o suporte.`,
      },
    ],
    apple: [
      {
        id: 'apple-nome',
        label: 'Nome do app',
        hint: 'App Store Connect › Informações do app.',
        limit: 30,
        text: c.appName,
      },
      {
        id: 'apple-subtitulo',
        label: 'Subtítulo',
        hint: 'Aparece embaixo do nome, na busca e na ficha. Vale tanto quanto o nome para ser encontrado.',
        limit: 30,
        text: 'Faturas, Pix e suporte',
      },
      {
        id: 'apple-keywords',
        label: 'Palavras-chave',
        hint: 'Separe por vírgula, sem espaço depois dela — espaço gasta caractere. Não repita o nome do app: ele já é indexado.',
        limit: 100,
        text: 'fatura,boleto,2via,pix,internet,provedor,plano,banda larga,wifi,consumo,assinante,suporte',
      },
      {
        id: 'apple-promo',
        label: 'Texto promocional',
        hint: 'Editável sem enviar nova versão — é onde se anuncia mutirão de negociação, mudança de vencimento e afins.',
        limit: 170,
        text: `Sua fatura da ${c.name} no celular: veja o valor, copie o código Pix e pague em segundos, sem ligar para o atendimento.`,
      },
      {
        id: 'apple-descricao',
        label: 'Descrição',
        hint: 'Mesma descrição da Play — a Apple não indexa a descrição, então ela é para o cliente ler.',
        limit: 4000,
        text: descricao,
      },
      {
        id: 'apple-revisao',
        label: 'Notas para a revisão (App Review Information)',
        hint: 'O texto mais importante do envio: é a resposta antecipada às três diretrizes que reprovam este tipo de app.',
        text: notasParaRevisaoApple(c),
      },
      {
        id: 'apple-novidades',
        label: 'Novidades desta versão',
        hint: 'Na primeira publicação a Apple aceita a descrição do app.',
        limit: 4000,
        text: `Primeira versão do aplicativo da ${c.name}: faturas, código Pix, 2ª via do boleto, nota fiscal, plano contratado e canal direto com o suporte.`,
      },
    ],
    comum: [
      {
        id: 'privacidade',
        label: 'Política de privacidade',
        hint: 'As duas lojas exigem uma URL pública. Publique este texto numa página do site da empresa e use o endereço dela nas duas fichas. Passe antes pelo jurídico do provedor: o modelo cobre o que a central faz hoje, não o que a empresa faz fora dela.',
        text: politicaDePrivacidade(c),
      },
    ],
  };
}
