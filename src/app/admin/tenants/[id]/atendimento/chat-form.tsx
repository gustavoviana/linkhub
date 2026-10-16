'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/portal/icons';
import { AdminScreen } from '@/components/admin/page-header';

interface Estado {
  configurado: boolean;
  ativo: boolean;
  dica: string | null;
  atualizadoEm: string | null;
}

export default function ChatForm({ tenantId, estado }: { tenantId: string; estado: Estado }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [cpf, setCpf] = useState('');
  const [testando, setTestando] = useState(false);
  const [teste, setTeste] = useState<{ ok: boolean; texto: string; url?: string } | null>(null);

  async function enviar(metodo: 'PUT' | 'DELETE', corpo?: object, ok?: string) {
    setSalvando(true);
    setErro(null);
    setAviso(null);
    const r = await fetch(`/api/tenants/${tenantId}/chat`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: corpo ? JSON.stringify(corpo) : undefined,
    }).catch(() => null);
    setSalvando(false);
    if (!r) return setErro('Não conseguimos falar com o servidor.');
    if (!r.ok) return setErro(await r.text());
    setToken('');
    setTeste(null);
    if (ok) setAviso(ok);
    router.refresh();
  }

  async function testar(e: React.FormEvent) {
    e.preventDefault();
    setTestando(true);
    setTeste(null);
    const r = await fetch(`/api/tenants/${tenantId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf_cnpj: cpf }),
    }).catch(() => null);
    setTestando(false);
    if (!r) return setTeste({ ok: false, texto: 'Não conseguimos falar com o servidor.' });
    if (!r.ok) return setTeste({ ok: false, texto: await r.text() });
    const { url } = (await r.json()) as { url: string };
    setTeste({ ok: true, texto: 'Funcionando. O FiberDesk devolveu o link do atendimento.', url });
  }

  return (
    <AdminScreen
      eyebrow="Configuração"
      title="Chat de atendimento"
      description="Um botão “Falar no chat” na central e no aplicativo. O assinante entra no atendimento já identificado, sem digitar CPF, e a conversa cai no seu inbox."
      largura="max-w-3xl space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>FiberDesk</CardTitle>
              <CardSubtitle>Cole o token da integração e o botão aparece para os seus clientes</CardSubtitle>
            </div>
            {estado.configurado ? (
              <Badge tone={estado.ativo ? 'success' : 'warning'}>{estado.ativo ? 'ligado' : 'desligado'}</Badge>
            ) : (
              <Badge>não configurado</Badge>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {estado.configurado && (
            <div className="flex items-center gap-3 p-3 rounded-md bg-bg-3 border border-border">
              <Icon name="lock" size={15} className="text-fg-3 shrink-0" />
              <div className="flex-1 min-w-0 text-sm">
                Token salvo: <code className="font-mono text-xs">{estado.dica}</code>
                {estado.atualizadoEm && (
                  <span className="text-fg-3 text-xs">
                    {' '}· atualizado em {new Date(estado.atualizadoEm).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar('PUT', { api_key: token.trim() }, 'Token salvo. O botão já aparece na tela de Suporte da central.');
            }}
            className="space-y-3"
          >
            <Field
              label={estado.configurado ? 'Trocar o token' : 'Token da integração'}
              hint="No FiberDesk: Configurações → Integrações → Chat no seu app → Gerar chave. O token começa com fdapp_ e só aparece uma vez lá."
            >
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="fdapp_…"
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" loading={salvando} disabled={!token.trim()}>
                {estado.configurado ? 'Salvar novo token' : 'Salvar e ligar o chat'}
              </Button>
              {estado.configurado && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={salvando}
                    onClick={() =>
                      enviar(
                        'PUT',
                        { enabled: !estado.ativo },
                        estado.ativo ? 'Chat desligado. O botão saiu da central.' : 'Chat ligado.',
                      )
                    }
                  >
                    {estado.ativo ? 'Desligar o chat' : 'Ligar o chat'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={salvando}
                    onClick={() => {
                      if (window.confirm('Remover o token? O botão do chat sai da central na hora.')) {
                        enviar('DELETE', undefined, 'Token removido.');
                      }
                    }}
                  >
                    Remover token
                  </Button>
                </>
              )}
            </div>
          </form>

          {erro && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{erro}</div>}
          {aviso && <div className="text-sm text-success bg-success/10 rounded-md p-3">✓ {aviso}</div>}

          <div className="flex gap-3 p-4 rounded-md bg-bg-3 border border-border">
            <span className="text-fg-3 shrink-0 mt-0.5">
              <Icon name="shield" size={16} />
            </span>
            <p className="text-xs text-fg-2 leading-relaxed m-0">
              O token fica cifrado no nosso servidor e nunca vai para o navegador nem para dentro do
              aplicativo. Quando o assinante toca em “Falar no chat”, o servidor pede ao FiberDesk um
              link pessoal que vale 15 minutos. Se o token vazar, gere outro no FiberDesk: o anterior
              para de valer no mesmo instante.
            </p>
          </div>
        </CardBody>
      </Card>

      {estado.configurado && estado.ativo && (
        <Card>
          <CardHeader>
            <CardTitle>Testar a integração</CardTitle>
            <CardSubtitle>Pede um link de verdade, como se esse assinante tivesse tocado no botão</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <form onSubmit={testar} className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1">
                <Field
                  label="CPF ou CNPJ"
                  hint="Use o seu ou o de um assinante real. Se o contato não existir no FiberDesk, ele é criado lá."
                >
                  <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
                </Field>
              </div>
              <Button type="submit" variant="secondary" loading={testando} disabled={cpf.replace(/\D/g, '').length < 11}>
                Testar
              </Button>
            </form>
            {teste && (
              <div
                className={`text-sm rounded-md p-3 ${teste.ok ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}
              >
                {teste.ok ? '✓ ' : ''}
                {teste.texto}
                {teste.url && (
                  <>
                    {' '}
                    <a href={teste.url} target="_blank" rel="noreferrer" className="font-semibold underline">
                      Abrir o chat ↗
                    </a>
                  </>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </AdminScreen>
  );
}
