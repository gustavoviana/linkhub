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
  const { nome, caminho, credencial, conexaoRecusada, usuarioDaApi, certificado, permissao } =
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

  // O ERP aceitou a credencial e barrou o recurso. No IXC a API roda com as
  // permissões do grupo do usuário do token, então cada tabela é liberada em
  // separado — o token pode estar perfeito e a consulta voltar recusada. Vem
  // antes do 401 pelo mesmo motivo que a restrição de IP: a credencial já
  // passou, e tratar isso como token errado mandava o provedor trocar uma
  // chave que estava certa.
  const semPermissao = /n[ãa]o tem permiss[ãa]o para acessar o recurso\s*:?\s*([\w.]+)/i.exec(bruto);
  if (semPermissao) {
    return (
      `O ${nome} aceitou a credencial e recusou o recurso "${semPermissao[1]}": o usuário da ` +
      'API autentica, mas não tem permissão de consulta nessa tabela. O token está certo — o ' +
      `que falta é a permissão, liberada ${permissao ?? caminho}.`
    );
  }

  // Recurso que a instalação não expõe. Não é credencial nem permissão, e não
  // há nada que o provedor possa ajustar no ERP dele — o ajuste é do nosso
  // lado, então a mensagem para de mandá-lo procurar.
  if (/recurso\s+[\w.]+\s+n[ãa]o est[áa] dispon[íi]vel/i.test(bruto)) {
    return (
      `O ${nome} não oferece esse recurso no webservice desta instalação. Não é o seu token ` +
      'nem permissão faltando: a consulta usa um endereço que essa versão do ERP não expõe. ' +
      'O ajuste é na integração — avise o suporte do LinkHub.'
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
