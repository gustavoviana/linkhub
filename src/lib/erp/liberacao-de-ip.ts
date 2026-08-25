import type { ErpType } from '@/lib/supabase/types';

// Liberação de IP no ERP do provedor.
//
// ERP brasileiro costuma trancar o webservice por IP: o token está certo, a
// autenticação passa, e mesmo assim a chamada volta recusada porque o endereço
// de quem chamou não está na lista. Foi o que travou a LM NET — o IXC responde
// "Seu IP não está liberado para efetuar login!".
//
// O IP que o ERP precisa liberar é o de **saída** da aplicação, o endereço de
// onde as chamadas partem. Não é o IP para onde o domínio aponta: esse é o de
// entrada, e num deploy sem servidor os dois nem moram na mesma máquina.
//
// Como o de saída depende de infraestrutura (IP fixo contratado, proxy na
// frente das chamadas), ele vem de configuração — `ERP_OUTBOUND_IP`. Sem a
// variável o painel não inventa um número: mandar o suporte do ERP liberar um
// endereço errado gasta o pedido à toa. Em vez disso muda o pedido — passa a
// ser para desligar a restrição no usuário da API, que é a saída que sobra
// para quem roda sem IP fixo.

/** Aceita "1.2.3.4", "1.2.3.0/24" e IPv6; recusa o resto. */
function ehEnderecoValido(valor: string): boolean {
  const [endereco, prefixo, ...sobra] = valor.split('/');
  if (sobra.length || !endereco) return false;

  const octetos = endereco.split('.');
  if (octetos.length === 4) {
    const numerico = octetos.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255);
    if (!numerico) return false;
    return prefixo === undefined || (/^\d{1,2}$/.test(prefixo) && Number(prefixo) <= 32);
  }

  // IPv6: checagem de forma, não de semântica — o valor é para exibir e copiar.
  if (endereco.includes(':') && /^[0-9a-f:]+$/i.test(endereco)) {
    return prefixo === undefined || (/^\d{1,3}$/.test(prefixo) && Number(prefixo) <= 128);
  }

  return false;
}

/**
 * Lê a lista de IPs de saída da configuração. Aceita vários separados por
 * vírgula, espaço ou quebra de linha — provedor com mais de uma saída existe.
 * Endereço malformado é descartado em silêncio: melhor a tela dizer que não há
 * IP configurado do que exibir um valor que o suporte do ERP não vai aceitar.
 */
export function parseIpsDeSaida(bruto: string | undefined | null): string[] {
  const partes = String(bruto ?? '')
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const vistos = new Set<string>();
  return partes.filter((p) => {
    if (!ehEnderecoValido(p) || vistos.has(p)) return false;
    vistos.add(p);
    return true;
  });
}

interface DadosDaMensagem {
  erpType: ErpType;
  /** Nome do provedor, como ele se apresenta ao suporte do ERP. */
  provedor: string;
  /** Base URL da central, se já estiver salva. */
  baseUrl?: string;
  ips: string[];
}

interface Sistema {
  nome: string;
  /**
   * Onde, dentro do ERP, a restrição de IP é configurada. Já vem com a
   * preposição: cada sistema nomeia o lugar de um jeito, e um prefixo fixo
   * no chamador produziria "em nas configurações".
   */
  caminho: string;
  /** Como o ERP recusa quando o IP não está na lista. */
  erro?: string;
  /** Formato da credencial, para orientar quem errou o preenchimento. */
  credencial?: string;
}

/** Nome do sistema e onde, dentro dele, a liberação é feita. */
export const ONDE_LIBERAR: Partial<Record<ErpType, Sistema>> = {
  ixc: {
    nome: 'IXC',
    caminho: 'em Configurações → Integrações → Webservice, no cadastro do usuário da API',
    erro: 'Seu IP não está liberado para efetuar login!',
    credencial:
      'o token precisa ser o Base64 de "usuario:chave" — se você tem os dois separados, ' +
      'pode colar no formato usuario:chave que o LinkHub codifica',
  },
  sgp: {
    nome: 'SGP',
    caminho:
      'nas configurações da API da Central do Assinante, no cadastro do app da integração',
    credencial: 'confira o nome do app e o token da integração',
  },
  hubsoft: {
    nome: 'Hubsoft',
    caminho: 'no cadastro da aplicação que usa o OAuth da API',
    credencial: 'confira client id, client secret, usuário e senha da aplicação',
  },
  mk_solutions: {
    nome: 'MK Solutions',
    caminho: 'no cadastro do usuário do webservice',
    credencial: 'confira o usuário e a senha do webservice',
  },
};

export const SISTEMA_GENERICO: Sistema = {
  nome: 'ERP',
  caminho: 'no cadastro do usuário da API',
};

export function sistemaDoErp(erpType: ErpType | string): Sistema {
  return ONDE_LIBERAR[erpType as ErpType] ?? SISTEMA_GENERICO;
}

/**
 * Texto pronto para o provedor mandar ao suporte do ERP. Sai completo — nome,
 * central e IP já preenchidos — porque o pedido some no meio do atendimento
 * quando chega com lacuna para o suporte adivinhar.
 *
 * Com IP fixo configurado, pede a liberação daquele endereço. Sem ele, pede o
 * desligamento da restrição no usuário da API: é o que resta para quem roda
 * sem IP de saída estável, e é um pedido que o suporte sabe atender. Deixar a
 * tela sem mensagem nenhuma nesse caso era um beco sem saída — o provedor via
 * o diagnóstico e não tinha o que fazer com ele.
 */
export function mensagemDeLiberacao({ erpType, provedor, baseUrl, ips }: DadosDaMensagem): string {
  const sistema = sistemaDoErp(erpType);
  const nome = provedor.trim() || 'nosso provedor';
  const central = baseUrl ? ` com a central ${baseUrl}` : ' com a nossa central';
  const recusa = sistema.erro
    ? ` recusadas com a mensagem "${sistema.erro}"`
    : ' recusadas por restrição de IP';

  const cabecalho = [
    `Assunto: ${ips.length ? 'Liberação de IP' : 'Restrição de IP'} no webservice do ${sistema.nome} — ${nome}`,
    '',
    `Olá, equipe ${sistema.nome}.`,
    '',
    `Sou responsável pelo provedor ${nome} e uso uma integração${central}.`,
    '',
    `As chamadas da nossa aplicação ao webservice estão sendo${recusa}.`,
    '',
  ];

  const pedido = ips.length
    ? [
        `Peço a liberação ${ips.length > 1 ? 'dos IPs abaixo' : 'do IP abaixo'} para o usuário da API:`,
        '',
        ...ips.map((ip) => `  ${ip}`),
      ]
    : [
        'A nossa aplicação roda em infraestrutura sem IP de saída fixo, então não há um',
        'endereço estável para incluir na lista — qualquer IP que eu informasse hoje',
        'deixaria de valer amanhã.',
        '',
        'Por isso peço que a restrição de IP seja desligada no usuário da API que usamos',
        'nessa integração, mantendo a autenticação por token.',
      ];

  return [
    ...cabecalho,
    ...pedido,
    '',
    `O ajuste é feito ${sistema.caminho}.`,
    '',
    'Obrigado.',
  ].join('\n');
}
