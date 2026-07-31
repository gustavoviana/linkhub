-- Tela de entrada do assinante: imagem e textos do provedor.
--
-- Até aqui a entrada era só o formulário. O protótipo (docs/prototipo) prevê
-- uma tela dividida: foto da marca de um lado, formulário do outro. A foto e os
-- dois textos passam a ser do provedor; quem não mexer fica com o texto padrão,
-- que vive no código (src/lib/portal/login-copy.ts) e não em default de coluna
-- — assim mudar a redação padrão não exige migração nem reescrever linha.

alter table public.tenants
  add column if not exists login_image_url text,
  add column if not exists login_headline text,
  add column if not exists login_subtitle text;

-- A tela de entrada é pública, anterior ao login: sem essas colunas na view o
-- visitante anônimo veria a tela sem imagem e com o texto genérico.
--
-- Colunas novas entram no fim da lista: `create or replace view` só aceita
-- acréscimo no final.
create or replace view public.tenants_public as
  select id, slug, name, status, layout,
         primary_color, accent_color, dark_mode_default,
         logo_url, favicon_url,
         support_phone, support_whatsapp, support_email,
         custom_domain, custom_domain_verified,
         logo_dark_url,
         login_image_url, login_headline, login_subtitle
  from public.tenants;

grant select on public.tenants_public to anon, authenticated;
