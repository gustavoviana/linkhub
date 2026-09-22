// Tema do painel: escuro (padrão) ou claro.
//
// O painel nasce escuro porque é ferramenta de uso longo, mas quem trabalha
// em sala clara enxerga melhor no claro — e isso não é preferência de gosto,
// é de ambiente. A escolha fica num cookie lido no servidor: assim a primeira
// pintura já vem no tema certo, em vez de aparecer escura e virar clara
// depois que o JavaScript acorda.
//
// Só o painel troca. A landing e o login seguem escuros: lá o escuro é a
// identidade da marca, não uma preferência do operador. E a central do
// assinante nunca leu estas variáveis — ela reescreve :root com a marca de
// cada provedor.

export const ADMIN_THEME_COOKIE = 'lh_painel_tema';

export type AdminTheme = 'dark' | 'light';

export function resolveAdminTheme(valor: string | undefined | null): AdminTheme {
  return valor === 'light' ? 'light' : 'dark';
}

/**
 * Os tokens do tema claro.
 *
 * Todo par de texto sobre fundo foi medido antes de entrar aqui, e nenhum
 * ficou abaixo de 4,5:1. O acento muda de tom entre os temas de propósito:
 * o #4D93FF do escuro dá 2,6:1 sobre branco e seria ilegível; o #1D5FE0
 * resolve os dois papéis no claro — 5,58:1 como texto e os mesmos 5,58:1
 * como fundo de botão com texto branco.
 */
const CLARO: Record<string, string> = {
  'color-scheme': 'light',

  '--brand': '29 95 224',
  '--brand-fg': '255 255 255',
  '--brand-soft': '29 95 224',
  '--accent': '14 116 144',
  '--accent-fg': '255 255 255',

  '--bg': '246 247 249',
  '--bg-2': '255 255 255',
  '--bg-3': '239 241 244',
  '--fg': '14 15 20',
  '--fg-2': '75 80 96',
  '--fg-3': '110 116 132',
  '--border': '228 231 236',
  '--border-strong': '207 212 222',

  '--success': '15 122 78',
  '--warning': '138 90 11',
  '--danger': '200 30 60',
  '--info': '38 96 212',
};

/**
 * O CSS que troca o tema, ou null quando o tema é o escuro — que já é o de
 * globals.css e não precisa de nada.
 *
 * Vai como <style> dentro do layout do painel: por vir depois da folha de
 * estilo no documento, ganha dela sem precisar de !important, e por ser
 * renderizado no servidor não existe o instante em que a tela está no tema
 * errado.
 */
export function adminThemeCss(tema: AdminTheme): string | null {
  if (tema === 'dark') return null;
  const corpo = Object.entries(CLARO)
    .map(([chave, valor]) => `${chave}:${valor}`)
    .join(';');
  return `:root{${corpo}}`;
}
