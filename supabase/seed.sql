-- Dados de demo (rode com `supabase db reset`).
-- Cria um tenant 'demo' já com planos e um cliente exemplo (sem auth).

insert into tenants (slug, name, legal_name, status, layout, primary_color, accent_color, erp_type, support_phone, support_whatsapp, support_email)
values (
  'demo', 'NetVale Telecom Demo', 'NetVale Telecom Comunicações LTDA',
  'active', 'v1', '#6d4ae0', '#0aa5c0', 'mock',
  '(54) 3220-0000', '5554998800000', 'contato@netvale.com.br'
)
on conflict (slug) do nothing;

with t as (select id from tenants where slug = 'demo')
insert into plans (tenant_id, external_id, name, description, down_mbps, up_mbps, price_cents, fidelity_months)
select t.id, p.external_id, p.name, p.description, p.down, p.up, p.price, p.fid from t,
(values
  ('PL-100', 'Fibra 100', 'Plano residencial 100 Mbps', 100, 50,  8990, 12),
  ('PL-300', 'Fibra 300', 'Plano residencial 300 Mbps', 300, 150, 10990, 12),
  ('PL-500', 'Fibra 500', 'Plano residencial 500 Mbps', 500, 250, 12990, 12),
  ('PL-1G',  'Fibra 1G',  'Plano residencial 1 Gbps',  1000, 500, 15990, 24),
  ('PL-EMP', 'Empresarial', 'Plano dedicado empresarial', 500, 500, 39900, 0)
) as p(external_id, name, description, down, up, price, fid)
on conflict do nothing;
