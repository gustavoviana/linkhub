'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/portal/icons';
import { PasswordGenerator, forcaDaSenha } from '@/components/ui/password-generator';

// Conta do super administrador: senha e segundo fator.

interface Fator {
  id: string;
  friendly_name?: string;
  status: string;
  created_at: string;
}

export default function AccountScreen({ email }: { email: string }) {
  const router = useRouter();

  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [okSenha, setOkSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);

  const [fatores, setFatores] = useState<Fator[] | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [trabalhando, setTrabalhando] = useState(false);
  const [erroMfa, setErroMfa] = useState<string | null>(null);
  const [okMfa, setOkMfa] = useState<string | null>(null);

  const carregarFatores = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFatores((data?.totp ?? []) as Fator[]);
  }, []);

  useEffect(() => {
    void carregarFatores();
  }, [carregarFatores]);

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErroSenha(null);
    setOkSenha(false);

    const r = await fetch('/api/platform/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: atual, new_password: nova }),
    }).catch(() => null);
    setSalvando(false);

    if (!r) return setErroSenha('Não conseguimos falar com o servidor.');
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setErroSenha(body.error ?? 'Não foi possível trocar a senha.');

    setOkSenha(true);
    setAtual('');
    setNova('');
  }

  async function ativarMfa() {
    setTrabalhando(true);
    setErroMfa(null);
    const supabase = createClient();

    // Cadastro pela metade de uma tentativa anterior atrapalha o próximo: o
    // Supabase recusa dois fatores com o mesmo nome.
    const { data: existentes } = await supabase.auth.mfa.listFactors();
    for (const f of existentes?.totp ?? []) {
      if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `LinkHub Plataforma ${new Date().toLocaleDateString('pt-BR')}`,
      issuer: 'LinkHub',
    });
    setTrabalhando(false);

    if (error || !data) {
      setErroMfa(error?.message ?? 'Não foi possível iniciar a ativação.');
      return;
    }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmarMfa(valor: string) {
    if (!enroll) return;
    setTrabalhando(true);
    setErroMfa(null);
    const supabase = createClient();

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enroll.id,
      code: valor,
    });
    setTrabalhando(false);

    if (error) {
      setErroMfa('Código incorreto ou expirado. O código muda a cada 30 segundos.');
      setCodigo('');
      return;
    }

    setEnroll(null);
    setCodigo('');
    setOkMfa('Verificação em duas etapas ativada.');
    await carregarFatores();
    router.refresh();
  }

  async function desativarMfa(id: string) {
    setTrabalhando(true);
    setErroMfa(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setTrabalhando(false);
    if (error) {
      setErroMfa(error.message);
      return;
    }
    setOkMfa('Verificação em duas etapas desativada.');
    await carregarFatores();
    router.refresh();
  }

  const ativos = (fatores ?? []).filter((f) => f.status === 'verified');
  const forca = forcaDaSenha(nova);
  const senhaFraca = nova.length > 0 && forca.bits < 50;

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Minha conta</h1>
        <p className="text-sm text-fg-2 mt-1 font-mono">{email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trocar a senha</CardTitle>
          <CardSubtitle>
            Pedimos a senha atual mesmo com você já logado: é o que protege a conta de quem senta no
            seu computador
          </CardSubtitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={trocarSenha} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-fg-2 mb-1.5">Senha atual</label>
              <input
                type="password"
                required
                value={atual}
                onChange={(e) => setAtual(e.target.value)}
                autoComplete="current-password"
                className="w-full h-10 px-3 rounded-md border border-border bg-bg-2 text-sm"
              />
            </div>

            <PasswordGenerator value={nova} onChange={setNova} label="Senha nova" />

            {senhaFraca && (
              <p className="text-xs text-warning">
                Essa senha é fraca para uma conta que controla todos os provedores. Use o gerador.
              </p>
            )}

            {erroSenha && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{erroSenha}</div>}
            {okSenha && (
              <div className="text-sm text-success bg-success/10 rounded-md p-3">
                Senha trocada. Da próxima vez, entre com ela.
              </div>
            )}

            <Button type="submit" loading={salvando} disabled={nova.length < 12 || !atual}>
              Trocar a senha
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verificação em duas etapas</CardTitle>
          <CardSubtitle>
            Um código de 6 dígitos do seu celular, além da senha, para entrar no painel da plataforma
          </CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {fatores === null && <p className="text-sm text-fg-2">Carregando…</p>}

          {fatores !== null && ativos.length > 0 && !enroll && (
            <>
              {ativos.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-md border border-success/30 bg-success/5 flex-wrap">
                  <Icon name="shield" size={16} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{f.friendly_name ?? 'Aplicativo autenticador'}</div>
                    <div className="text-xs text-fg-2">
                      ativado em {new Date(f.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <Badge tone="success">ativa</Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={trabalhando}
                    onClick={() => desativarMfa(f.id)}
                  >
                    Desativar
                  </Button>
                </div>
              ))}
              <p className="text-xs text-fg-2 leading-relaxed">
                A partir de agora, entrar no painel da plataforma pede o código do aplicativo. O
                painel do provedor continua só com a senha.
              </p>
            </>
          )}

          {fatores !== null && ativos.length === 0 && !enroll && (
            <>
              <p className="text-sm text-fg-2 leading-relaxed">
                Sem o segundo fator, a senha é tudo o que separa alguém do controle de todos os
                provedores, das senhas dos clientes e do faturamento. Ativar leva um minuto e
                funciona com Google Authenticator, Authy, 1Password ou o gerenciador de senhas do
                seu celular.
              </p>
              <Button type="button" onClick={ativarMfa} loading={trabalhando}>
                Ativar verificação em duas etapas
              </Button>
            </>
          )}

          {enroll && (
            <div className="space-y-4">
              <ol className="text-sm text-fg-2 space-y-1.5 leading-relaxed">
                <li>1. Abra o aplicativo autenticador do seu celular.</li>
                <li>2. Toque em adicionar conta e aponte a câmera para o código abaixo.</li>
                <li>3. Digite aqui o código de 6 dígitos que aparecer.</li>
              </ol>

              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <QrCode svg={enroll.qr} />

                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-fg-2 mb-1">
                      Sem câmera? Digite este código no aplicativo:
                    </div>
                    <code className="block font-mono text-xs bg-bg-3 border border-border rounded px-3 py-2 break-all">
                      {enroll.secret}
                    </code>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-fg-2 mb-1.5">
                      Código do aplicativo
                    </label>
                    <input
                      value={codigo}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setCodigo(v);
                        if (v.length === 6) void confirmarMfa(v);
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      disabled={trabalhando}
                      className="w-full h-12 text-center text-xl font-mono tracking-[0.4em] rounded-md border border-border bg-bg-3 focus:border-brand outline-none disabled:opacity-60"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      loading={trabalhando}
                      disabled={codigo.length !== 6}
                      onClick={() => confirmarMfa(codigo)}
                    >
                      Confirmar
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEnroll(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-fg-2 leading-relaxed">
                <strong className="text-fg">Guarde o código escrito acima num lugar seguro.</strong>{' '}
                Se você perder o celular sem ele, a saída é rodar{' '}
                <code className="font-mono">node scripts/super-admin.mjs {email} --remover-2fa</code>{' '}
                da máquina onde está o projeto.
              </div>
            </div>
          )}

          {erroMfa && <div className="text-sm text-danger bg-danger/10 rounded-md p-3">{erroMfa}</div>}
          {okMfa && <div className="text-sm text-success bg-success/10 rounded-md p-3">{okMfa}</div>}
        </CardBody>
      </Card>
    </div>
  );
}

/**
 * O Supabase devolve o QR ora como SVG cru, ora como data URI, conforme a
 * versão do Auth. Tratar os dois evita a caixa vazia que ninguém entende.
 */
function QrCode({ svg }: { svg: string }) {
  const ehDataUri = svg.trim().startsWith('data:');
  return (
    <div className="bg-white p-3 rounded-lg border border-border shrink-0 w-[200px] h-[200px] flex items-center justify-center">
      {ehDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={svg} alt="QR Code da verificação em duas etapas" className="w-full h-full" />
      ) : (
        <div
          className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}
