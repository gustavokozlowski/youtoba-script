// Sobe a API (:3000) e a interface no Vite (:5173) juntas: `npm run dev:all`, e abra http://localhost:5173.
// A saída de cada uma vem marcada com [api] ou [web]. Ctrl+C, ou uma das duas cair, derruba as duas.
// Sem dependências: só node:child_process e node:readline.
const { spawn } = require('node:child_process');
const readline = require('node:readline');

// O que muda por sistema é só o jeito de abrir e derrubar processos. Linux e macOS são POSIX (grupos de
// processos e sinais) e seguem o mesmo caminho; o Windows não tem grupos nem sinais e segue outro.
const IS_WINDOWS = process.platform === 'win32';

// O login do Google volta para a interface no Vite. Um WEB_URL já definido no terminal continua valendo
// (o dotenv da API não sobrescreve variáveis que já existem, então isto vence o .env de propósito).
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173/';

// A saída passa por um pipe (para ganhar o prefixo), então a API pediria JSON; no terminal, pede legível.
const LOG_FORMAT = process.env.LOG_FORMAT ?? (process.stdout.isTTY ? 'pretty' : 'json');

const TASKS = [
    { name: 'api', script: 'dev', env: { WEB_URL, LOG_FORMAT } },
    { name: 'web', script: 'dev:web', env: {} },
];

let stopping = false;
const children = TASKS.map(start);

function start({ name, script, env }) {
    // Grupo de processos próprio (fora do Windows): dá para derrubar o npm e tudo que ele abriu de uma vez.
    // No Windows o npm é um .cmd, que só roda com shell; os argumentos são fixos, sem entrada do usuário.
    const child = spawn('npm', ['run', script], {
        env: { ...process.env, ...env, FORCE_COLOR: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: !IS_WINDOWS,
        shell: IS_WINDOWS,
    });
    prefixLines(child.stdout, process.stdout, name);
    prefixLines(child.stderr, process.stderr, name);
    child.on('exit', (code, signal) => {
        if (!stopping) console.log(`[dev:all] ${name} parou (${signal ?? `código ${code}`}); parando o resto.`);
        stopAll(code ?? 1);
    });
    return child;
}

function prefixLines(input, output, name) {
    readline.createInterface({ input }).on('line', (line) => output.write(`[${name}] ${line}\n`));
}

function stopAll(exitCode) {
    if (stopping) return;
    stopping = true;
    process.exitCode = exitCode;
    for (const child of children) stopTree(child);
}

function stopTree(child) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    if (IS_WINDOWS) stopWindowsTree(child);
    else stopPosixGroup(child);
}

// O sinal vai para o grupo inteiro (pid negativo): o npm e tudo que ele abriu.
function stopPosixGroup(child) {
    try {
        process.kill(-child.pid, 'SIGTERM');
    } catch {
        // O grupo já saiu entre a checagem e o kill: nada a fazer.
    }
}

// child.kill() derrubaria só o npm e deixaria o Vite e o ts-node-dev segurando as portas;
// o taskkill /T leva a árvore inteira. Argumentos fixos e o pid do próprio filho, sem entrada do usuário.
function stopWindowsTree(child) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).on('error', () => child.kill());
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
