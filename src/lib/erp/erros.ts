import type { ErpType } from '@/lib/supabase/types';
import { sistemaDoErp } from './liberacao-de-ip';

// Tradução das falhas de integração para algo que o provedor consiga resolver.
//
// O que chega aqui é a mensagem crua do ERP ou do fetch: um HTML de nginx, um
// "fetch failed", um "type":"error" repassado pelo adapter. Nada disso diz ao
// dono do provedor o que fazer, e é ele quem tem acesso ao ERP para arrumar.
//
// Os casos são os mesmos em qualquer ERP brasileiro — restrição de IP,
// credencial recusada, host errado, servidor fora do ar. O que muda é onde,
// dentro daquele sistema, o ajuste é feito; isso vem de `sistemaDoErp`, a
// mesma fonte que monta o pedido para o suporte. Por isso a tradução mora
// aqui, e não dentro de um adapter: senão cada ERP novo repetiria o texto.

/** Tira HTML, junta espaços e corta — página de erro de nginx não é mensagem. */
export function limparMensagem(bruto: string, limite = 220): string {
  const limpo = bruto.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return limpo.length > limite ? `${limpo.slice(0, limite)}…` : limpo;
}

/** A falha é a restrição de IP do webservice? */
export function ehBloqueioDeIp(bruto: string): boolean {
  return /n[ãa]o est[áa] liberado|ip n[ãa]o liberado|ip bloqueado|ip n[ãa]o autorizado/i.test(bruto);
}

/**
 * Traduz o erro de uma integração para uma instrução acionável.
 *
 * A ordem importa: a restrição de IP vem antes do 401 porque ela acontece
 * *depois* de a credencial ser aceita — tratá-la como credencial errada
 * mandava o provedor trocar um token que estava certo.
 */
export function explicarErroDoErp(erpType: ErpType | string, erro: unknown): string {
  const bruto = erro instanceof Error ? erro.message : String(erro ?? '');
  const { nome, caminho, credencial, conexaoRecusada, usuarioDaApi, certificado } =
    sistemaDoErp(erpType);

  if (ehBloqueioDeIp(bruto)) {
    return (
      `O ${nome} aceitou a credencial e recusou o endereço: o webservice está com restrição ` +
      'de IP ligada e o IP de onde as nossas chamadas saem não está na lista. É por isso que ' +
      'a integração parece conectada e mesmo assim nenhum cliente aparece — o ERP responde a ' +
      'consulta com a recusa no lugar dos dados. O ajuste é feito ' +
      `${caminho}. Use o quadro "Liberação de IP no seu ERP", abaixo, para mandar o pedido ` +
      'pronto ao suporte.'
    );
  }

  if (/\b401\b|unauthorized|autoriza[çc][ãa]o requerida/i.test(bruto)) {
    return (
      `O ${nome} recusou a credencial (401). ` +
      (credencial ? `Confira o preenchimento: ${credencial}. ` : '') +
      `Confirme também se o usuário da API está ativo ${usuarioDaApi ?? caminho}. ` +
      'Se houver restrição de IP no webservice, o IP do servidor precisa estar liberado.'
    );
  }

  if (/\b403\b|forbidden/i.test(bruto)) {
    return (
      `O ${nome} aceitou a credencial mas bloqueou o acesso (403). Normalmente é restrição de ` +
      `IP ou permissão faltando para o usuário da API — os dois se ajustam ${caminho}.`
    );
  }

  if (/\b404\b|not found/i.test(bruto)) {
    return (
      'Endereço não encontrado (404). Confira a Base URL: deve ser o endereço da central, ' +
      'sem o caminho do webservice no final.'
    );
  }

  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(bruto)) {
    return `Não encontramos esse endereço. Confira o domínio da central do ${nome}.`;
  }

  if (/ECONNREFUSED|ETIMEDOUT|timeout|fetch failed|ECONNRESET|socket hang up/i.test(bruto)) {
    // Num ERP que tranca o webservice por firewall, esta é a cara da restrição
    // de IP: nada responde. Dizer só "pode estar fora do ar" manda o provedor
    // procurar no lugar errado, então quando o sistema tem essa pegadinha ela
    // vem escrita junto.
    return conexaoRecusada
      ? `Não conseguimos conectar no servidor do ${nome}. ${conexaoRecusada}`
      : `Não conseguimos conectar no servidor do ${nome}. Ele pode estar fora do ar, ou ` +
          'bloqueando conexões vindas de fora da rede do provedor.';
  }

  if (/certificate|SSL|TLS|CERT_/i.test(bruto)) {
    const base = `O certificado HTTPS da central do ${nome} não foi aceito.`;
    return certificado ? `${base} ${certificado}` : `${base} Confira se ele está válido.`;
  }

  // Sem padrão conhecido, devolve o que o ERP disse — legível, sem HTML cru.
  return limparMensagem(bruto) || `O ${nome} recusou a chamada sem informar o motivo.`;
}
