import type { Response } from 'express';

/** Escapa texto que vem de fora (o erro que o Google manda na URL) antes de pôr no HTML. */
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const renderPage = (title: string, body: string) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · youtoba</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.5; }
  a { color: #2563eb; }
  code { background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 4px; }
</style>
</head>
<body>
<h1>${title}</h1>
${body}
</body>
</html>`;

const retryLink = '<p><a href="/auth/login">Tentar de novo</a> · <a href="/">Voltar ao youtoba</a></p>';

/** Página de "login não concluído", com o link para tentar de novo. */
export const loginFailed = (res: Response, status: number, body: string) =>
    res.status(status).send(renderPage('Login não concluído', `${body}\n${retryLink}`));

/** O Google recusou o login (o erro vem na URL, então é escapado). */
export const googleRefused = (error: string) => `<p>O Google respondeu: <code>${escapeHtml(error)}</code>.</p>
<p>Se foi <code>access_denied</code>, confira se a conta está em <em>Usuários de teste</em> no Google Cloud.</p>`;
