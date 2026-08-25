'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Field, Label } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Tenant, ErpType } from '@/lib/supabase/types';
import type { MaskedErpConfig } from '@/lib/erp/crypto';
import { mensagemDeLiberacao } from '@/lib/erp/liberacao-de-ip';
import { instrucoesDoErp } from '@/lib/erp/instrucoes';
import { cn } from '@/lib/utils';

const ERPS: { id: ErpType; name: string; desc: string }[] = [
  { id: 'ixc', name: 'IXC Soft', desc: 'Auth via Base64(usuário:apiKey)' },
  { id: 'sgp', name: 'SGP', desc: 'App + token da API Central do Assinante' },
  { id: 'ispfy', name: 'ISPFY', desc: 'Token API do usuário do sistema' },
  { id: 'hubsoft', name: 'Hubsoft', desc: 'OAuth2 password grant' },
  { id: 'mk_solutions', name: 'MK Solutions', desc: 'Em breve' },
  { id: 'mock', name: 'Dados de teste', desc: 'Use enquanto integra. Mostra dados fictícios.' },
];

interface Removidos {
  customers: number;
  contracts: number;
  invoices: number;
  plans: number;
}

function contar(r: Removidos) {
  return [
    `${r.customers} cliente(s)`,
    `${r.contracts} contrato(s)`,
    `${r.plans} plano(s)`,
    `${r.invoices} fatura(s)`,
  ].join(', ');
}

/** Troca de ERP apaga o acervo do anterior; troca de senha só o vence. */
function descreverTroca(resultado: {
  removidos?: Removidos | null;
  trocouCredencial?: boolean;
} | null): string | null {
  if (resultado?.removidos) {
    return (
      `A integração passou a apontar para outro sistema, então removemos ${contar(resultado.removidos)} ` +
      'que tinham sido copiados do ERP anterior. Os dados do ERP novo entram na próxima consulta.'
    );
  }
  if (resultado?.trocouCredencial) {
    return (
      'Credencial atualizada. O que estava em cache foi marcado como vencido: a próxima ' +
      'consulta busca tudo de novo no ERP, sem esperar o intervalo de sincronização.'
    );
  }
  return null;
}

// O componente roda no navegador, mas o Next renderiza a primeira versão no
// servidor, que está em UTC. Sem fuso fixo as duas datas saem diferentes e a
// hidratação acusa divergência — por isso o horário é sempre o de Brasília,
// que é o que o provedor usa para se orientar.
function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

interface UltimaSync {
  em: string | null;
  status: string | null;
  /** Erro da última sincronização, já traduzido pelo servidor. */
  erro: string | null;
}

export default function ErpForm({
  tenant,
  masked,
  ipsDeSaida,
  ultimaSync,
}: {
  tenant: Tenant;
  masked: MaskedErpConfig;
  ipsDeSaida: string[];
  ultimaSync: UltimaSync;
}) {
  const router = useRouter();
  const [type, setType] = useState<ErpType>(tenant.erp_type);
  const [cfg, setCfg] = useState<any>(masked.config ?? {});
  // Segredo já salvo aparece como campo vazio com aviso; só é reenviado se o
  // admin digitar algo novo.
  const savedSecret = (field: string) => !!masked.saved?.[type]?.[field] && !cfg?.[type]?.[field];
  const secretHint = (field: string) =>
    savedSecret(field) ? 'Salvo. Deixe em branco para manter, ou digite um novo.' : undefined;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);
  // O que aconteceu com o que já tinha sido sincronizado quando a integração
  // mudou — o admin precisa ver, senão some dado sem explicação.
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<'ip' | 'mensagem' | null>(null);
  const [limpando, setLimpando] = useState(false);
  // A tela precisa dizer sozinha se a integração está de pé. Esperar o admin
  // clicar em "Testar conexão" foi o que deixou a LM NET semanas achando que
  // estava tudo certo: o painel não mostrava nada, e o erro só aparecia para o
  // assinante, escrito como se o CPF dele estivesse errado.
  const [checando, setChecando] = useState(false);

  function updateCfg(key: string, value: string) {
    setCfg((c: any) => ({ ...c, [type]: { ...(c[type] ?? {}), [key]: value } }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    // Credencial de ERP não é gravada pelo browser — vai pelo servidor, que
    // valida papel e formato antes de escrever.
    const r = await fetch(`/api/tenants/${tenant.id}/erp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ erp_type: type, erp_config: cfg }),
    });
    setSaving(false);
    if (!r.ok) { setError(await r.text()); return; }

    const resultado = await r.json().catch(() => null);
    setAviso(descreverTroca(resultado));
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  // O que o provedor precisa fazer do lado de lá, no ERP dele. Acompanha o
  // sistema escolhido: enquanto ele passeia pela lista, a tela já mostra o
  // caminho daquele ERP em vez de esperar ele salvar para descobrir.
  const instrucoes = instrucoesDoErp(type);

  // Pedido pronto para o suporte do ERP, montado com o que já está na tela —
  // o provedor não deveria ter que redigitar nome, central nem IP.
  const pedidoDeLiberacao = mensagemDeLiberacao({
    erpType: type,
    provedor: tenant.name,
    baseUrl: cfg?.[type]?.baseUrl,
    ips: ipsDeSaida,
  });

  async function copiar(texto: string, qual: "ip" | "mensagem") {
    await navigator.clipboard.writeText(texto);
    setCopiado(qual);
    window.setTimeout(() => setCopiado(null), 2500);
  }

  async function limparCache() {
    const confirmado = window.confirm(
      'Apagar os clientes, contratos, planos e faturas que o LinkHub copiou do ERP?\n\n' +
        'Nada é perdido: tudo volta do ERP configurado agora, na próxima consulta.',
    );
    if (!confirmado) return;

    setLimpando(true);
    setError(null);
    const r = await fetch(`/api/tenants/${tenant.id}/erp/cache`, { method: 'DELETE' });
    setLimpando(false);
    if (!r.ok) { setError(await r.text()); return; }

    const { removidos } = await r.json();
    setAviso(`Removidos ${contar(removidos)}. Tudo volta do ERP atual na próxima consulta.`);
    router.refresh();
  }

  // Roda no clique e sozinha ao abrir a tela, então não pode deixar promessa
  // rejeitada solta: uma queda de rede travaria o "Verificando…" para sempre.
  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch(`/api/tenants/${tenant.id}/erp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ erp_type: type, erp_config: cfg }),
      });
      setTestResult(r.ok ? await r.json() : { ok: false, message: await r.text() });
    } catch {
      setTestResult({
        ok: false,
        message: 'Não conseguimos falar com o servidor para checar a integração. Verifique sua conexão.',
      });
    } finally {
      setTesting(false);
    }
  }

  // Só vale checar a integração que está salva: enquanto o admin passeia pela
  // lista de ERPs, o que está na tela ainda não é a configuração do provedor.
  const integracaoSalva =
    tenant.erp_type !== 'mock' && !!masked.config?.[tenant.erp_type]?.baseUrl;

  useEffect(() => {
    if (!integracaoSalva) return;
    setChecando(true);
    testConnection().finally(() => setChecando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O que a tela afirma sobre a integração agora. A checagem ao vivo manda —
  // é deste instante; a última sincronização entra só quando não houve
  // resposta nenhuma ainda.
  type Diagnostico = { estado: 'checando' | 'ok' | 'falha'; texto: string };
  const diagnostico: Diagnostico | null = !integracaoSalva
    ? null
    : checando
      ? { estado: 'checando', texto: 'Verificando se o seu ERP está respondendo…' }
      : testResult
        ? testResult.ok
          ? {
              estado: 'ok',
              texto:
                'O seu ERP respondeu e aceitou a credencial. As consultas dos assinantes ' +
                'estão chegando ao sistema.',
            }
          : { estado: 'falha', texto: testResult.message ?? 'O seu ERP recusou a chamada.' }
        : ultimaSync.erro
          ? { estado: 'falha', texto: ultimaSync.erro }
          : null;

  return (
    <div className="p-8 max-w-4xl space-y-6">
      {diagnostico && (
        <div
          className={cn(
            'rounded-md border px-4 py-3.5 text-sm leading-relaxed',
            diagnostico.estado === 'falha' && 'border-danger/30 bg-danger/10 text-fg',
            diagnostico.estado === 'ok' && 'border-border bg-success/10 text-fg',
            diagnostico.estado === 'checando' && 'border-border bg-bg-3/50 text-fg-2',
          )}
        >
          <p className="font-medium mb-1">
            {diagnostico.estado === 'falha' && '✗ A integração não está funcionando'}
            {diagnostico.estado === 'ok' && '✓ Integração funcionando'}
            {diagnostico.estado === 'checando' && 'Verificando a integração…'}
          </p>
          <p className="text-fg-2">
            {diagnostico.texto}
          </p>
          {ultimaSync.em && (
            <p className="mt-2 text-xs text-fg-2">
              Última sincronização: {formatarData(ultimaSync.em)}
              {ultimaSync.status === 'error' && ' — terminou com erro'}
            </p>
          )}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Escolha o ERP</CardTitle>
          <CardSubtitle>Selecione o sistema de gestão que seu provedor usa</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {ERPS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setType(e.id)}
                className={cn(
                  'p-4 rounded-md border-2 text-left transition-all',
                  type === e.id ? 'border-brand bg-brand/5' : 'border-border hover:border-fg-3',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{e.name}</span>
                  {tenant.erp_type === e.id && <Badge tone="success">ativo</Badge>}
                </div>
                <p className="text-xs text-fg-2">{e.desc}</p>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {type !== 'mock' && instrucoes && (
        <Card>
          <CardHeader>
            <CardTitle>Como configurar no {instrucoes.nome}</CardTitle>
            <CardSubtitle>{instrucoes.resumo}</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <ol className="space-y-4">
              {instrucoes.passos.map((passo, i) => (
                <li key={passo.titulo} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                    {i + 1}
                  </span>
                  <div className="text-sm leading-relaxed">
                    <p className="font-medium text-fg">{passo.titulo}</p>
                    {passo.caminho && (
                      <p className="mt-1 text-xs text-fg-2">
                        Em{' '}
                        <code className="px-1.5 py-0.5 rounded bg-bg-3 text-fg">
                          {passo.caminho}
                        </code>
                      </p>
                    )}
                    <p className="mt-1 text-fg-2">{passo.detalhe}</p>
                  </div>
                </li>
              ))}
            </ol>

            {instrucoes.atencao && instrucoes.atencao.length > 0 && (
              <div className="rounded-md border border-border bg-bg-3/50 px-4 py-3">
                <p className="mb-1.5 text-sm font-medium text-fg">Antes de abrir chamado</p>
                <ul className="space-y-1.5 text-sm leading-relaxed text-fg-2">
                  {instrucoes.atencao.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden className="text-fg-3">
                        •
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {instrucoes.documentacao && (
              <a
                href={instrucoes.documentacao.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm text-brand hover:underline"
              >
                {instrucoes.documentacao.titulo} ↗
              </a>
            )}
          </CardBody>
        </Card>
      )}

      {type !== 'mock' && (
        <Card>
          <CardHeader>
            <CardTitle>Credenciais</CardTitle>
            <CardSubtitle>
              Configure a integração. As credenciais são gravadas pelo servidor e não ficam
              acessíveis pela chave pública do portal.
            </CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {type === 'ixc' && (
              <>
                <Field label="Base URL" hint="Ex: https://central.seuprovedor.com.br (sem barra final)">
                  <Input
                    value={cfg.ixc?.baseUrl ?? ''}
                    onChange={(e) => updateCfg('baseUrl', e.target.value)}
                    placeholder="https://central.seuprovedor.com.br"
                  />
                </Field>
                <Field
                  label="Token do webservice"
                  hint={
                    secretHint('token') ??
                    'Cole o Base64 de "usuário:chave" ou simplesmente usuário:chave — nós codificamos. Gere no IXC em Configurações → Integrações → Webservice.'
                  }
                >
                  <Input
                    type="password"
                    placeholder={savedSecret('token') ? '••••••••••••' : undefined}
                    value={cfg.ixc?.token ?? ''}
                    onChange={(e) => updateCfg('token', e.target.value)}
                  />
                </Field>
              </>
            )}

            {type === 'sgp' && (
              <>
                <Field label="Base URL" hint="Ex: https://seu-provedor.sgp.net.br">
                  <Input
                    value={cfg.sgp?.baseUrl ?? ''}
                    onChange={(e) => updateCfg('baseUrl', e.target.value)}
                  />
                </Field>
                <Field label="App">
                  <Input
                    value={cfg.sgp?.app ?? ''}
                    onChange={(e) => updateCfg('app', e.target.value)}
                  />
                </Field>
                <Field label="Token" hint={secretHint('token')}>
                  <Input
                    type="password"
                    placeholder={savedSecret('token') ? '••••••••••••' : undefined}
                    value={cfg.sgp?.token ?? ''}
                    onChange={(e) => updateCfg('token', e.target.value)}
                  />
                </Field>
              </>
            )}

            {type === 'ispfy' && (
              <>
                <Field
                  label="Endereço do servidor"
                  hint="Inclua a porta do webservice — 8043 para HTTPS, 8020 para HTTP. Ex: https://central.seuprovedor.com.br:8043"
                >
                  <Input
                    value={cfg.ispfy?.baseUrl ?? ''}
                    onChange={(e) => updateCfg('baseUrl', e.target.value)}
                    placeholder="https://central.seuprovedor.com.br:8043"
                  />
                </Field>
                <Field
                  label="Token da API"
                  hint={
                    secretHint('token') ??
                    'O campo "Token API" do usuário, no ISPFY em Sistema → Usuários. Ele herda as permissões desse usuário.'
                  }
                >
                  <Input
                    type="password"
                    placeholder={savedSecret('token') ? '••••••••••••' : undefined}
                    value={cfg.ispfy?.token ?? ''}
                    onChange={(e) => updateCfg('token', e.target.value)}
                  />
                </Field>
              </>
            )}

            {type === 'hubsoft' && (
              <>
                <Field label="Base URL">
                  <Input
                    value={cfg.hubsoft?.baseUrl ?? ''}
                    onChange={(e) => updateCfg('baseUrl', e.target.value)}
                    placeholder="https://api.seuprovedor.hubsoft.com.br"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Client ID">
                    <Input
                      value={cfg.hubsoft?.clientId ?? ''}
                      onChange={(e) => updateCfg('clientId', e.target.value)}
                    />
                  </Field>
                  <Field label="Client Secret" hint={secretHint('clientSecret')}>
                    <Input
                      type="password"
                      placeholder={savedSecret('clientSecret') ? '••••••••' : undefined}
                      value={cfg.hubsoft?.clientSecret ?? ''}
                      onChange={(e) => updateCfg('clientSecret', e.target.value)}
                    />
                  </Field>
                  <Field label="Usuário">
                    <Input
                      value={cfg.hubsoft?.username ?? ''}
                      onChange={(e) => updateCfg('username', e.target.value)}
                    />
                  </Field>
                  <Field label="Senha" hint={secretHint('password')}>
                    <Input
                      type="password"
                      placeholder={savedSecret('password') ? '••••••••' : undefined}
                      value={cfg.hubsoft?.password ?? ''}
                      onChange={(e) => updateCfg('password', e.target.value)}
                    />
                  </Field>
                </div>
              </>
            )}

            <div className="flex gap-2 items-center pt-2">
              <Button type="button" variant="outline" size="sm" onClick={testConnection} loading={testing}>
                Testar conexão
              </Button>
              {testResult && (
                <span
                  className={cn(
                    'text-sm leading-relaxed',
                    testResult.ok ? 'text-success' : 'text-danger',
                  )}
                >
                  {testResult.ok ? '✓ Conexão OK' : `✗ ${testResult.message}`}
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {type !== 'mock' && (
        <Card>
          <CardHeader>
            <CardTitle>Liberação de IP no seu ERP</CardTitle>
            <CardSubtitle>
              A maioria dos ERPs só aceita chamadas de endereços liberados. Se a integração
              está com a credencial certa e ainda assim é recusada, normalmente é isto.
            </CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {ipsDeSaida.length === 0 ? (
              <div className="rounded-md border border-border bg-bg-3/50 px-4 py-3 text-sm leading-relaxed text-fg-2">
                <p className="text-fg font-medium mb-1">Sem IP fixo de saída.</p>
                <p>
                  O endereço que o ERP precisa liberar é o de <strong>saída</strong> — de onde as
                  chamadas partem — e não o IP para onde o seu domínio aponta. Esta aplicação roda
                  em infraestrutura sem IP de saída fixo: o endereço muda sozinho, e qualquer
                  liberação feita hoje pararia de valer. Por isso o pedido abaixo vai escrito de
                  outro jeito — ele pede ao suporte que desligue a restrição de IP no usuário da
                  API, mantendo a autenticação por token. Se um dia houver IP fixo, basta
                  preencher
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-bg-3 text-fg text-xs">ERP_OUTBOUND_IP</code>
                  que o pedido passa a trazer o endereço.
                </p>
              </div>
            ) : (
              <div>
                <Label>{ipsDeSaida.length > 1 ? 'IPs de saída' : 'IP de saída'}</Label>
                <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                  <code className="px-3 py-2 rounded-md bg-bg-3 text-fg text-sm font-mono">
                    {ipsDeSaida.join(', ')}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copiar(ipsDeSaida.join(', '), 'ip')}
                  >
                    Copiar IP
                  </Button>
                  {copiado === 'ip' && <span className="text-sm text-success">✓ Copiado</span>}
                </div>
                <p className="mt-1.5 text-xs text-fg-2">
                  É este endereço que o ERP precisa liberar — de onde as chamadas partem, não
                  o IP para onde o seu domínio aponta.
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <Label>Pedido pronto para o suporte</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copiar(pedidoDeLiberacao, 'mensagem')}
                >
                  Copiar mensagem
                </Button>
                {copiado === 'mensagem' && <span className="text-sm text-success">✓ Copiado</span>}
              </div>
              <pre className="text-xs bg-bg-3 rounded-md p-4 overflow-auto max-h-80 text-fg-2 leading-relaxed whitespace-pre-wrap">
                {pedidoDeLiberacao}
              </pre>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados sincronizados</CardTitle>
          <CardSubtitle>
            Clientes, contratos, planos e faturas que o LinkHub copiou do ERP. Trocar a
            integração de sistema já limpa isso sozinho — use o botão quando a conta ficou com
            dados de outro ERP, de um teste de integração por exemplo.
          </CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="flex gap-3 items-center flex-wrap">
            <Button type="button" variant="danger" size="sm" loading={limpando} onClick={limparCache}>
              Limpar dados sincronizados
            </Button>
            <span className="text-xs text-fg-2">
              Nada é perdido: tudo volta do ERP configurado agora. Chamados de suporte ficam.
            </span>
          </div>
        </CardBody>
      </Card>

      {aviso && (
        <div className="rounded-md border border-border bg-bg-3/50 px-4 py-3 text-sm leading-relaxed text-fg-2">
          {aviso}
        </div>
      )}

      <div className="flex gap-3 items-center sticky bottom-0 bg-bg-2 border-t border-border -mx-8 px-8 py-3">
        <Button onClick={save} loading={saving}>Salvar integração</Button>
        {saved && <span className="text-sm text-success">✓ Salvo</span>}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </div>
  );
}
