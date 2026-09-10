import type { Tenant } from '@/lib/supabase/types';
import { tenantOrigin } from './app-config';
import type { StoreCopyContext } from './store-copy';

// Documentos jurídicos da central, montados a partir do cadastro do provedor.
//
// A política de privacidade já existia em store-copy.ts, feita para o provedor
// copiar e colar num site próprio. Aqui ela ganha endereço fixo e companhia:
// os termos de uso, que as lojas não exigem mas que faltavam para o app
// parecer o que é — um serviço com regras escritas.
//
// Duas diferenças em relação ao texto de copiar e colar. A primeira é que aqui
// não pode haver marcador do tipo "[complete com o CNPJ]": esta página é
// pública e quem lê é o revisor da loja. Sem o dado, a frase simplesmente se
// reorganiza sem ele. A segunda é que o provedor é sempre o autor — o LinkHub
// é operador, não controlador, e o documento não fala em nome dele.

/** Endereços fixos dos documentos, no domínio do provedor. */
export function urlsLegais(tenant: Tenant): { privacidade: string; termos: string } {
  const origem = tenantOrigin(tenant);
  return { privacidade: `${origem}/privacidade`, termos: `${origem}/termos` };
}

/** Quem é a empresa, com CNPJ quando ele existe. */
function identificacao(c: StoreCopyContext, hospedada: boolean) {
  if (c.cnpj) return `${c.legalName}, inscrita no CNPJ sob o nº ${c.cnpj}`;
  return hospedada ? c.legalName : `${c.legalName} [complete com o CNPJ]`;
}

/** E-mail de contato. Na página pública, sem e-mail cadastrado a frase cai
 *  para a central de atendimento em vez de exibir um marcador. */
function contatoEscrito(c: StoreCopyContext, hospedada: boolean) {
  if (c.supportEmail) return `pelo e-mail ${c.supportEmail}`;
  if (hospedada) return `pela central de atendimento em ${c.origin}/suporte`;
  return 'pelo e-mail [cadastre o e-mail de suporte em Configurações]';
}

function canaisDeAtendimento(c: StoreCopyContext) {
  const linhas: string[] = [`- Central de atendimento: ${c.origin}/suporte`];
  if (c.supportEmail) linhas.push(`- E-mail: ${c.supportEmail}`);
  if (c.supportWhatsapp) linhas.push(`- WhatsApp: ${c.supportWhatsapp}`);
  if (c.supportPhone) linhas.push(`- Telefone: ${c.supportPhone}`);
  return linhas.join('\n');
}

export function termosDeUso(c: StoreCopyContext, hospedada = false) {
  const quem = identificacao(c, hospedada);
  const contato = contatoEscrito(c, hospedada);

  return `TERMOS DE USO — APLICATIVO ${c.appName.toUpperCase()}

Última atualização: ${c.today}

1. QUEM SOMOS

${quem} ("${c.name}", "nós") é a responsável por este aplicativo e pelo serviço de internet contratado por você. Fale conosco ${contato}.

2. O QUE ESTES TERMOS REGULAM

Estes termos valem para o uso do aplicativo e da central do cliente da ${c.name}. Eles não substituem nem alteram o contrato de prestação do serviço de internet que você assinou: o que estiver escrito lá continua valendo, e em caso de divergência sobre o serviço prevalece o contrato.

3. QUEM PODE USAR

O aplicativo é destinado ao titular do contrato de internet da ${c.name}, maior de 18 anos. Não há cadastro dentro do aplicativo: o acesso usa os dados que já existem por causa do contrato.

4. COMO FUNCIONA O ACESSO

A entrada é feita com o CPF ou o CNPJ do titular do contrato. O acesso é pessoal: você é responsável por manter em sigilo suas credenciais e por tudo que for feito na sua sessão. Se suspeitar de uso indevido, avise-nos ${contato} para bloquearmos o acesso.

5. O QUE O APLICATIVO FAZ

Consultar faturas em aberto e pagas, copiar o código Pix e a linha digitável, baixar a 2ª via do boleto e a nota fiscal, acompanhar o plano contratado e o consumo, conferir os dados cadastrais e abrir chamados de suporte.

6. O QUE O APLICATIVO NÃO FAZ

O aplicativo não processa pagamentos, não vende planos nem serviços, não é canal de contratação e não altera o seu contrato. Nenhum valor é cobrado pelo uso do aplicativo — o que se paga é o serviço de internet, nos termos do contrato.

7. PAGAMENTOS

O código Pix e o boleto exibidos são emitidos pela ${c.name} e o pagamento acontece fora do aplicativo, no aplicativo ou no site do seu banco. A baixa da fatura depende da confirmação da instituição financeira e pode levar até alguns dias úteis para aparecer aqui. Não coletamos nem armazenamos dados de cartão de crédito.

8. SUAS RESPONSABILIDADES

Usar o aplicativo de boa-fé e de acordo com a lei, manter seus dados de contato atualizados e não tentar acessar dados de terceiros, burlar a autenticação, automatizar acessos em massa ou interferir no funcionamento do serviço. O descumprimento pode levar à suspensão do acesso ao aplicativo, sem prejuízo das medidas previstas no contrato e na lei.

9. DISPONIBILIDADE

Trabalhamos para manter o aplicativo disponível, mas ele pode ficar fora do ar por manutenção, falha técnica ou motivo alheio à nossa vontade. A indisponibilidade do aplicativo não suspende nem prorroga as obrigações do contrato de internet, inclusive as datas de vencimento das faturas: nesses casos, use os canais de atendimento listados abaixo.

Informações exibidas aqui podem depender de sistemas próprios ou de terceiros e, em caso de divergência, prevalece o registro oficial da ${c.name}.

10. PROPRIEDADE INTELECTUAL

A marca, o nome, o logotipo, os textos e o desenho do aplicativo pertencem à ${c.name} ou a quem licenciou seu uso. É permitido usar o aplicativo para a finalidade a que ele se destina; não é permitido copiar, redistribuir, modificar ou explorar comercialmente esses elementos sem autorização por escrito.

11. PRIVACIDADE

O tratamento dos seus dados pessoais está descrito na Política de Privacidade, publicada em ${c.origin}/privacidade, que faz parte integrante destes termos.

12. MUDANÇAS NESTES TERMOS

Podemos atualizar estes termos para refletir mudanças no aplicativo ou na legislação. A versão vigente fica sempre publicada em ${c.origin}/termos e a data no topo indica a última alteração. O uso do aplicativo após a atualização significa concordância com a nova versão.

13. ATENDIMENTO

${canaisDeAtendimento(c)}

Se não resolvermos sua demanda, você pode recorrer aos órgãos de defesa do consumidor e à Anatel, pelo telefone 1331 ou em anatel.gov.br.

14. LEI APLICÁVEL E FORO

Estes termos são regidos pelas leis brasileiras, entre elas o Código de Defesa do Consumidor (Lei nº 8.078/1990) e o Marco Civil da Internet (Lei nº 12.965/2014). Fica eleito o foro do domicílio do consumidor para resolver questões decorrentes destes termos.`;
}

export interface SecaoLegal {
  /** Título numerado da seção. Nulo no bloco de abertura. */
  titulo: string | null;
  paragrafos: string[];
}

export interface DocumentoLegal {
  titulo: string;
  atualizadoEm: string | null;
  secoes: SecaoLegal[];
}

/** Quebra o texto corrido em seções para a página poder dar hierarquia a ele.
 *  Título de seção é linha única que começa com número e ponto — o formato que
 *  os dois documentos seguem. */
export function lerDocumento(texto: string): DocumentoLegal {
  const blocos = texto.trim().split(/\n{2,}/);
  const titulo = blocos.shift() ?? '';
  let atualizadoEm: string | null = null;

  const secoes: SecaoLegal[] = [];
  let atual: SecaoLegal = { titulo: null, paragrafos: [] };

  for (const bloco of blocos) {
    const limpo = bloco.trim();
    if (!limpo) continue;

    if (/^Última atualização:/i.test(limpo)) {
      atualizadoEm = limpo.replace(/^Última atualização:\s*/i, '');
      continue;
    }

    if (!limpo.includes('\n') && /^\d+\.\s+\S/.test(limpo)) {
      if (atual.titulo || atual.paragrafos.length) secoes.push(atual);
      atual = { titulo: limpo, paragrafos: [] };
      continue;
    }

    atual.paragrafos.push(limpo);
  }

  if (atual.titulo || atual.paragrafos.length) secoes.push(atual);

  return { titulo, atualizadoEm, secoes };
}
