/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  // O selo de dev do Next fica por cima da barra de navegação e apareceria
  // nos screenshots gerados em ambiente local.
  devIndicators: false,
  // O Chromium e o puppeteer não podem entrar no bundle: são binários que a
  // função carrega do disco em tempo de execução.
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  experimental: {
    serverActions: { allowedOrigins: ['*.linkhub.api.br', 'localhost:3000'] },
  },
};

module.exports = nextConfig;
