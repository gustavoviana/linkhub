export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-3 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">Provedor não encontrado</h1>
        <p className="text-fg-2 text-sm">
          Esse subdomínio ainda não está vinculado a um provedor. Se você é o dono dele, acesse o painel administrativo do LinkHub para concluir a configuração.
        </p>
      </div>
    </div>
  );
}
