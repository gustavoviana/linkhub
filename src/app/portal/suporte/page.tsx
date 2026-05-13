import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/tenant/resolve';
import { getCurrentCustomer } from '@/lib/auth/session';
import { BottomNav } from '@/components/portal/bottom-nav';
import { Button } from '@/components/ui/button';
import { IconHelp } from '@/components/portal/icons';

export default async function SuportePage() {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer(tenant.id);
  if (!customer) redirect('/login');

  return (
    <div className="md:flex">
      <BottomNav />
      <main className="flex-1 min-h-screen pb-24 md:pb-0">
        <div className="max-w-md mx-auto md:max-w-2xl px-4 py-6">
          <h1 className="text-2xl font-bold mb-1">Suporte</h1>
          <p className="text-sm text-fg-2 mb-6">Como podemos te ajudar hoje?</p>

          <div className="bg-success/5 border border-success/20 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <div className="font-semibold">Sua conexão está estável</div>
                <div className="text-xs text-fg-2">Sem alertas na sua região</div>
              </div>
            </div>
          </div>

          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-2 mb-3">
            Resoluções rápidas
          </h2>
          <div className="space-y-2 mb-6">
            {[
              ['Reiniciar minha conexão', 'Útil quando a internet está lenta'],
              ['Testar velocidade', 'Mede sua banda agora'],
              ['Trocar senha do Wi-Fi', 'Atualiza o roteador remotamente'],
              ['Agendar visita técnica', 'Marca um horário com o técnico'],
            ].map(([t, d]) => (
              <button
                key={t}
                className="w-full flex items-center gap-3 bg-bg-2 border border-border rounded-xl p-4 text-left hover:border-brand transition-colors"
              >
                <div className="w-9 h-9 rounded-md bg-brand/10 text-brand flex items-center justify-center">
                  <IconHelp size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{t}</div>
                  <div className="text-xs text-fg-2">{d}</div>
                </div>
              </button>
            ))}
          </div>

          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-2 mb-3">
            Falar direto
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {tenant.support_whatsapp && (
              <a href={`https://wa.me/${tenant.support_whatsapp}`} target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full justify-start">
                  💬 WhatsApp · {tenant.support_whatsapp}
                </Button>
              </a>
            )}
            {tenant.support_phone && (
              <a href={`tel:${tenant.support_phone.replace(/\D/g, '')}`}>
                <Button variant="outline" className="w-full justify-start">
                  📞 Telefone · {tenant.support_phone}
                </Button>
              </a>
            )}
            {tenant.support_email && (
              <a href={`mailto:${tenant.support_email}`}>
                <Button variant="outline" className="w-full justify-start">
                  ✉️ E-mail · {tenant.support_email}
                </Button>
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
