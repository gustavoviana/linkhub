import type { Tenant } from '@/lib/supabase/types';

// Contrato entre o formulário de marca (painel) e o iframe da prévia.
// Fica num módulo próprio pra o painel não precisar importar os componentes
// do portal só pra falar com o iframe.

export type PreviewTheme = Pick<
  Tenant,
  | 'name'
  | 'logo_url'
  | 'logo_dark_url'
  | 'login_image_url'
  | 'login_headline'
  | 'login_subtitle'
  | 'primary_color'
  | 'accent_color'
  | 'dark_mode_default'
  | 'layout'
  | 'support_phone'
  | 'support_whatsapp'
  | 'support_email'
>;

export type { PreviewScreen } from '@/lib/tenant/preview-screens';

/** Painel → iframe: novo estado do formulário. */
export const PREVIEW_UPDATE = 'linkhub:preview-update';

/** Iframe → painel: já montei, pode mandar o estado. */
export const PREVIEW_READY = 'linkhub:preview-ready';
