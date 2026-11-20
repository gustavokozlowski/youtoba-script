import request from 'supertest';

/** Começa o login em /auth/login (como o navegador) e devolve o state e o code_challenge que foram ao Google. */
export async function startLogin(agent: ReturnType<typeof request.agent>) {
    const res = await agent.get('/auth/login');
    const url = new URL(res.headers.location);
    return { res, state: url.searchParams.get('state') ?? '', challenge: url.searchParams.get('code_challenge') ?? '' };
}

/** Login completo no mesmo navegador: /auth/login e depois a volta do Google com o code. */
export async function login(app: Parameters<typeof request.agent>[0], code = 'codigo-valido') {
    const agent = request.agent(app);
    const { state } = await startLogin(agent);
    return agent.get(`/auth?code=${code}&state=${state}`);
}
