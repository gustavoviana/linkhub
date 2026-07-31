-- Logo alternativa para o modo escuro.
--
-- Marca escura em fundo escuro some. Quem tem uma versão clara da logo passa a
-- poder enviá-la aqui; quem não tem continua com a mesma imagem nos dois temas,
-- que é o comportamento de hoje.

alter table public.tenants add column if not exists logo_dark_url text;

-- A view pública é o que o visitante anônimo enxerga antes de entrar — sem a
-- coluna aqui, a tela de login ficaria com a logo errada no escuro.
--
-- A coluna nova entra no fim da lista: `create or replace view` só aceita
-- acréscimo no final, renomear ou reordenar dá erro.
create or replace view public.tenants_public as
  select id, slug, name, status, layout,
         primary_color, accent_color, dark_mode_default,
         logo_url, favicon_url,
         support_phone, support_whatsapp, support_email,
         custom_domain, custom_domain_verified,
         logo_dark_url
  from public.tenants;

grant select on public.tenants_public to anon, authenticated;
