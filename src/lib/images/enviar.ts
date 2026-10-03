// Envio de imagem do painel para o Storage, pelo servidor.
//
// Sobe por /api/tenants/[id]/assets e não direto do navegador: assim vale a
// mesma guarda das outras rotas do painel, que inclui o super administrador.

export async function enviarImagem(
  tenantId: string,
  prefixo: 'logo' | 'logo-dark' | 'favicon' | 'login' | 'app-icon',
  arquivo: Blob,
  ext: string,
): Promise<{ url: string } | { error: string }> {
  const tipo = arquivo.type || 'image/png';
  const body = new FormData();
  body.append('prefix', prefixo);
  body.append('file', new File([arquivo], `${prefixo}.${ext}`, { type: tipo }));

  const r = await fetch(`/api/tenants/${tenantId}/assets`, { method: 'POST', body }).catch(() => null);
  if (!r) return { error: 'Não conseguimos falar com o servidor.' };
  const json = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!r.ok || !json.url) return { error: json.error ?? 'Não foi possível enviar a imagem.' };
  return { url: json.url };
}
