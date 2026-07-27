-- Modo de acesso à central do cliente.
--
-- Padrão do mercado brasileiro: o assinante entra só com o CPF. Alguns
-- provedores (ou o ERP deles) exigem senha; por isso é uma escolha do
-- provedor, e não uma decisão fixa do produto.
--
-- false (padrão) = entra só com CPF
-- true           = exige CPF + senha

alter table tenants
  add column if not exists portal_require_password boolean not null default false;

comment on column tenants.portal_require_password is
  'Quando true, a central do cliente exige senha além do CPF.';
