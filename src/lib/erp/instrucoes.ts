import type { ErpType } from '@/lib/supabase/types';

// O que o provedor precisa fazer, dentro do ERP dele, para a integração
// funcionar.
//
// Isto não é documentação: é a tela de configuração explicando os passos que
// não acontecem nela. Colar um token não basta em nenhum ERP brasileiro — há
// sempre um usuário para criar, um webservice para ligar e um firewall para
// liberar, tudo do outro lado, no sistema do provedor. Quando a tela não conta
// isso, o provedor preenche os campos, vê a integração recusada e abre chamado
// conosco para descobrir que faltava um clique no ERP dele.
//
// Mora aqui, e não dentro do formulário, pelo mesmo motivo que o guia das
// lojas mora em `tenant/store-guide`: é conteúdo, muda mais que a tela, e cada
// ERP novo devia entrar acrescentando um bloco de dados — não editando JSX.

export interface PassoDeIntegracao {
  titulo: string;
  detalhe: string;
  /** Onde, dentro do ERP, o passo é feito. Sai destacado do texto. */
  caminho?: string;
}

export interface InstrucoesDeIntegracao {
  nome: string;
  /** O que ter em mãos antes de começar. */
  resumo: string;
  passos: PassoDeIntegracao[];
  /**
   * As pegadinhas daquele ERP — o que responde o chamado antes de ele ser
   * aberto. Só entra aqui o que já custou um atendimento ou está escrito na
   * documentação do fabricante.
   */
  atencao?: string[];
  documentacao?: { titulo: string; url: string };
}

export const INSTRUCOES: Partial<Record<ErpType, InstrucoesDeIntegracao>> = {
  ispfy: {
    nome: 'ISPFY',
    resumo:
      'A integração usa a API do seu próprio servidor ISPFY. Você vai precisar do Token API de ' +
      'um usuário do sistema e de liberar o acesso no firewall do ISPFY — os dois se fazem ' +
      'dentro do painel do ISPFY, sem abrir chamado.',
    passos: [
      {
        titulo: 'Escolha o usuário que vai atender a integração',
        caminho: 'Menu principal → Sistema → Usuários',
        detalhe:
          'O token é individual e herda as permissões do usuário. Use um usuário com acesso a ' +
          'clientes, contratos e financeiro: o que ele não pode ver no ISPFY, a central do ' +
          'assinante também não vê.',
      },
      {
        titulo: 'Copie o Token API',
        caminho: 'Sistema → Usuários → abra o cadastro do usuário',
        detalhe:
          'O campo "Token API" já vem preenchido pelo próprio ISPFY. Copie o valor e cole no ' +
          'campo Token da API, aqui em cima.',
      },
      {
        titulo: 'Libere o acesso à API no firewall do ISPFY',
        caminho: 'Sistema → Parâmetros → Rede → aba Firewall',
        detalhe:
          'Vá até o serviço da API, clique em "Adicionar", informe a network que terá acesso e ' +
          'clique em "Aplicar firewall", no canto superior direito. Sem esse passo o ISPFY ' +
          'descarta a conexão sem responder nada, e a integração parece servidor fora do ar.',
      },
      {
        titulo: 'Confira a porta do webservice',
        detalhe:
          'As rotas privadas da API ouvem na porta 8043 (HTTPS) e 8020 (HTTP) — separadas das ' +
          'portas da central web. Se o ISPFY roda em servidor próprio, a porta também precisa ' +
          'estar aberta nele, além da liberação no firewall do sistema.',
      },
      {
        titulo: 'Preencha os dois campos e teste',
        detalhe:
          'No endereço, informe o servidor com a porta: https://central.seuprovedor.com.br:8043. ' +
          'Cole o Token API e clique em "Testar conexão" — o resultado aparece na hora.',
      },
    ],
    atencao: [
      'A network 0.0.0.0/0 libera o acesso para qualquer IP. O ISPFY não aceita as duas coisas ' +
        'ao mesmo tempo: com algum IP na lista ele recusa a 0.0.0.0/0, e com a 0.0.0.0/0 na ' +
        'lista ele recusa IPs avulsos. É preciso remover um para poder incluir o outro.',
      'Se o certificado HTTPS do servidor for autoassinado, a chamada é recusada por ' +
        'certificado inválido. Nesse caso use a porta 8020, em HTTP, e mantenha o firewall ' +
        'liberado apenas para o nosso endereço — o token trafega em texto puro fora do HTTPS.',
      'O ISPFY mede consumo por dia, não por hora. No gráfico da central, o período "Hoje" ' +
        'aparece como um ponto único, com o total do dia.',
      'O catálogo de planos não é exposto pelas rotas atuais da API, então a tela de Planos do ' +
        'painel fica vazia. O assinante não perde nada: o plano dele vem do ponto de internet ' +
        'do contrato, com nome e velocidade.',
    ],
    documentacao: {
      titulo: 'Documentação da API do ISPFY',
      url: 'https://www.ispfy.com.br/api/postman',
    },
  },

  ixc: {
    nome: 'IXC Soft',
    resumo:
      'A integração usa o webservice do IXC, autenticado por um token gerado no cadastro de um ' +
      'usuário da API.',
    passos: [
      {
        titulo: 'Gere o token do webservice',
        caminho: 'Configurações → Integrações → Webservice',
        detalhe:
          'No cadastro do usuário da API. Guarde o usuário e a chave: o token é o Base64 de ' +
          '"usuario:chave".',
      },
      {
        titulo: 'Cole o token aqui',
        detalhe:
          'Pode colar o Base64 já pronto ou simplesmente usuario:chave — nós codificamos. ' +
          'Colar só a chave, sem o usuário, é o erro mais comum e resulta em 401.',
      },
      {
        titulo: 'Informe o endereço da central',
        detalhe:
          'A Base URL é o endereço da central, sem o caminho do webservice no final: ' +
          'https://central.seuprovedor.com.br.',
      },
    ],
    atencao: [
      'O IXC recusa chamada respondendo HTTP 200, com o motivo escrito no corpo. O caso mais ' +
        'comum é a restrição de IP do webservice: a credencial está certa, a tela diz que ' +
        'conectou e mesmo assim nenhum assinante aparece. Use o quadro "Liberação de IP no seu ' +
        'ERP", abaixo, para mandar o pedido pronto ao suporte.',
    ],
  },

  sgp: {
    nome: 'SGP',
    resumo:
      'A integração usa a API da Central do Assinante do SGP, autenticada pelo par nome do app ' +
      'e token.',
    passos: [
      {
        titulo: 'Cadastre o app da integração',
        caminho: 'nas configurações da API da Central do Assinante',
        detalhe: 'Anote o nome do app e o token gerado para ele.',
      },
      {
        titulo: 'Informe o endereço da sua central',
        detalhe: 'A Base URL é o endereço da central, por exemplo https://seu-provedor.sgp.net.br.',
      },
      {
        titulo: 'Preencha App e Token e teste',
        detalhe:
          'Credencial recusada volta como 403. Se o teste passar, a central já consegue ' +
          'consultar assinantes.',
      },
    ],
    atencao: [
      'A API da Central do Assinante não expõe catálogo de planos, então a tela de Planos do ' +
        'painel fica vazia. O plano vem escrito no contrato de cada assinante, e a central ' +
        'monta o cadastro a partir dele.',
    ],
  },

  hubsoft: {
    nome: 'Hubsoft',
    resumo:
      'A integração usa a API do Hubsoft com OAuth2 no modo password grant — além do client, ' +
      'ela pede um usuário e uma senha.',
    passos: [
      {
        titulo: 'Pegue as credenciais da aplicação',
        caminho: 'no cadastro da aplicação que usa o OAuth da API',
        detalhe: 'É de lá que saem o Client ID e o Client Secret.',
      },
      {
        titulo: 'Use o usuário e a senha da aplicação',
        detalhe:
          'São os quatro campos juntos que autenticam: sem usuário e senha, o client sozinho ' +
          'não gera token.',
      },
      {
        titulo: 'Informe o endereço da API',
        detalhe: 'A Base URL é o endereço da API, por exemplo https://api.seuprovedor.hubsoft.com.br.',
      },
    ],
  },
};

export function instrucoesDoErp(erpType: ErpType | string): InstrucoesDeIntegracao | null {
  return INSTRUCOES[erpType as ErpType] ?? null;
}
