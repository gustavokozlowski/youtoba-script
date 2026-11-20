import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, quota } from '../../test/fake-api';
import { render } from '../../test/render';
// biome-ignore lint/style/noRestrictedImports: este teste de comportamento cobre o fluxo completo de revisão e remoção.
import { RemovalScreen } from '../removal/RemovalScreen';
// biome-ignore lint/style/noRestrictedImports: este teste de comportamento cobre o histórico após uma remoção.
import { RemovalsScreen } from '../removal/RemovalsScreen';
import { ReviewScreen } from './ReviewScreen';

const item = (k: number) => ({
    posicao: 198 + k,
    titulo: k === 1 ? 'Um Bom Lugar' : `Faixa ${k}`,
    canal: k === 1 ? 'Sabotage' : 'Canal',
    videoId: `vid${k}`,
    playlistItemId: `it-${k}`,
    primeiraOcorrencia: k,
});
const preview = (n = 3) => ({
    playlistId: 'PLrap',
    totalItens: 338,
    ficam: 338 - n,
    duplicados: n,
    itensDuplicados: Array.from({ length: n }, (_, k) => item(k)),
    quota: {
        unidadesLeitura: 7,
        unidadesRemocao: n * 50,
        total: 7 + n * 50,
        limiteDiario: 10_000,
        cabeEmUmDia: true,
        maxRemocoesPorDia: 199,
        diasNecessarios: 1,
    },
    quotaHoje: quota,
    cabemHoje: n,
});
const job = (removed: number, overrides: Record<string, unknown> = {}) => ({
    jobId: 'job-1',
    playlistId: 'PLrap',
    status: removed < 3 ? 'running' : 'done',
    situacao: 'em andamento',
    progresso: `${removed} de 3 itens apagados`,
    percentual: Math.round((removed / 3) * 100),
    removidos: removed,
    total: 3,
    pendentes: 3 - removed,
    falhas: [],
    iniciadoEm: '2026-11-19T10:00:00.000Z',
    backup: 'backups/PLrap.json',
    restaurar: 'npm run restore:playlist -- backups/PLrap.json',
    itens: [0, 1, 2].map((k) => ({ ...item(k), estado: k < removed ? 'apagado' : 'pendente' })),
    quotaHoje: quota,
    ...overrides,
});

afterEach(() => vi.restoreAllMocks());

describe('Revisão', () => {
    it('mostra quantos saem e quantos ficam, e só libera a remoção com o número exato digitado', async () => {
        fakeApi({ '/playlist/PLrap/duplicates': { body: preview() }, '/quota': { body: quota } });
        render(<ReviewScreen playlistId="PLrap" />);

        const button = await screen.findByRole('button', { name: /remover 3 repetidos/i });
        expect(screen.getByText('335')).toBeInTheDocument();
        expect(button).toBeDisabled();

        const input = screen.getByLabelText(/digite 3 para confirmar/i);
        await userEvent.type(input, '2');
        expect(button).toBeDisabled();
        await userEvent.clear(input);
        await userEvent.type(input, '3');
        expect(button).toBeEnabled();
        expect(input).toHaveClass('is-confirmed');
    });

    it('confirmada, inicia a remoção com ?confirm=N e abre a tela de progresso', async () => {
        const fetchMock = fakeApi({
            '/playlist/PLrap/duplicates': { body: preview() },
            'DELETE /playlist/PLrap/remove-duplicates?confirm=3': { status: 202, body: job(0) },
        });
        render(<ReviewScreen playlistId="PLrap" />);
        await userEvent.type(await screen.findByLabelText(/digite 3 para confirmar/i), '3');
        await userEvent.click(screen.getByRole('button', { name: /remover 3 repetidos/i }));

        await waitFor(() => expect(window.location.hash).toBe('#/remocao/job-1'));
        expect(fetchMock).toHaveBeenCalledWith(
            '/playlist/PLrap/remove-duplicates?confirm=3',
            expect.objectContaining({ method: 'DELETE' }),
        );
    });

    it('se a playlist mudou e o número não bate mais, recarrega a lista e avisa', async () => {
        let reads = 0;
        fakeApi({
            '/playlist/PLrap/duplicates': () => ({ body: preview(++reads === 1 ? 3 : 2) }),
            'DELETE /playlist/PLrap/remove-duplicates?confirm=3': {
                status: 409,
                body: { erro: 'confirmation_required', mensagem: 'Confira os 2 duplicados' },
            },
        });
        render(<ReviewScreen playlistId="PLrap" />);
        await userEvent.type(await screen.findByLabelText(/digite 3 para confirmar/i), '3');
        await userEvent.click(screen.getByRole('button', { name: /remover 3 repetidos/i }));

        expect(await screen.findByText(/a playlist mudou/i)).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /remover 2 repetidos/i })).toBeDisabled();
    });

    it('se já existe uma remoção rodando nesta playlist, abre ela', async () => {
        fakeApi({
            '/playlist/PLrap/duplicates': { body: preview() },
            'DELETE /playlist/PLrap/remove-duplicates?confirm=3': {
                status: 409,
                body: { erro: 'already_running', jobId: 'job-9' },
            },
        });
        render(<ReviewScreen playlistId="PLrap" />);
        await userEvent.type(await screen.findByLabelText(/digite 3 para confirmar/i), '3');
        await userEvent.click(screen.getByRole('button', { name: /remover 3 repetidos/i }));
        await waitFor(() => expect(window.location.hash).toBe('#/remocao/job-9'));
    });

    it('voltar para a revisão logo depois não lê a playlist de novo (não gasta cota)', async () => {
        const fetchMock = fakeApi({ '/playlist/PLrap/duplicates': { body: preview() } });
        const { unmount, client } = render(<ReviewScreen playlistId="PLrap" />);
        await screen.findByRole('button', { name: /remover 3 repetidos/i });
        unmount();

        render(<ReviewScreen playlistId="PLrap" />, client);
        expect(screen.getByRole('button', { name: /remover 3 repetidos/i })).toBeInTheDocument();
        expect(fetchMock.mock.calls.filter(([url]) => url === '/playlist/PLrap/duplicates')).toHaveLength(1);
    });

    it('a busca filtra os repetidos por título ou canal', async () => {
        fakeApi({ '/playlist/PLrap/duplicates': { body: preview() } });
        render(<ReviewScreen playlistId="PLrap" />);
        await userEvent.type(await screen.findByRole('searchbox'), 'sabotage');
        const list = screen.getByRole('list', { name: /repetidos que saem/i });
        expect(within(list).getAllByRole('listitem')).toHaveLength(1);
        expect(within(list).getByText('Um Bom Lugar')).toBeInTheDocument();
    });

    it('sem repetidos, diz que não há nada a remover', async () => {
        fakeApi({ '/playlist/PLrap/duplicates': { body: preview(0) } });
        render(<ReviewScreen playlistId="PLrap" />);
        expect(await screen.findByText(/nenhum vídeo repetido/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /remover/i })).toBeNull();
    });
});

describe('Remoção', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
    afterEach(() => vi.useRealTimers());

    it('acompanha até terminar: o número desce, os apagados são marcados e a consulta para', async () => {
        let reads = 0;
        const fetchMock = fakeApi({
            '/jobs/job-1': () => ({ body: job(Math.min(3, reads++)) }),
            '/quota': { body: quota },
        });
        render(<RemovalScreen jobId="job-1" />);

        expect(await screen.findByText('3')).toBeInTheDocument();
        await act(() => vi.advanceTimersByTimeAsync(3_500));
        expect(await screen.findByText(/3 de 3 apagados/i)).toBeInTheDocument();
        expect(screen.getAllByText('apagado')).toHaveLength(3);

        const callsWhenDone = fetchMock.mock.calls.filter(([url]) => url === '/jobs/job-1').length;
        await act(() => vi.advanceTimersByTimeAsync(5_000));
        expect(fetchMock.mock.calls.filter(([url]) => url === '/jobs/job-1').length).toBe(callsWhenDone);
    });

    it('no término não mostra que itens ainda faltam', async () => {
        fakeApi({
            '/jobs/job-1': {
                body: job(1, {
                    status: 'done',
                    pendentes: 0,
                    percentual: 100,
                }),
            },
        });
        render(<RemovalScreen jobId="job-1" />);

        expect(await screen.findByRole('heading', { name: /pronto, repetidos apagados/i })).toBeInTheDocument();
        expect(screen.getByText('todos saíram')).toBeInTheDocument();
        expect(screen.queryByText(/ainda faltam?/i)).not.toBeInTheDocument();
    });

    it('quando para por cota, diz quando continuar e mostra como desfazer', async () => {
        fakeApi({
            '/jobs/job-1': {
                body: job(1, {
                    status: 'partial',
                    motivoParada: 'daily_budget',
                    proximoPasso: 'A quota do dia acabou. Rode a remoção de novo depois de 20/11/2026, 05:00.',
                }),
            },
        });
        render(<RemovalScreen jobId="job-1" />);
        expect(await screen.findByText(/a cota de hoje acabou/i)).toBeInTheDocument();
        expect(screen.getByText(/depois de 20\/11\/2026, 05:00/)).toBeInTheDocument();
        expect(screen.getByText('npm run restore:playlist -- backups/PLrap.json')).toBeInTheDocument();
    });

    it('job que sumiu (servidor reiniciou) explica e aponta o backup', async () => {
        fakeApi({
            '/jobs/job-1': { status: 404, body: { erro: 'job_not_found', mensagem: 'Remoção não encontrada.' } },
        });
        render(<RemovalScreen jobId="job-1" />);
        expect(await screen.findByText(/não encontrei essa remoção/i)).toBeInTheDocument();
    });
});

describe('Remoções', () => {
    it('lista as remoções desta sessão com link para cada uma', async () => {
        fakeApi({
            '/jobs': {
                body: {
                    remocoes: [
                        {
                            jobId: 'job-1',
                            playlistId: 'PLrap',
                            status: 'done',
                            situacao: 'concluída',
                            removidos: 3,
                            total: 3,
                            iniciadoEm: '2026-11-19T10:00:00.000Z',
                        },
                    ],
                },
            },
        });
        render(<RemovalsScreen />);
        expect(await screen.findByRole('link', { name: /PLrap/ })).toHaveAttribute('href', '#/remocao/job-1');
        expect(screen.getByText(/3 de 3/)).toBeInTheDocument();
    });

    it('sem remoções, explica o que aparece aqui', async () => {
        fakeApi({ '/jobs': { body: { remocoes: [] } } });
        render(<RemovalsScreen />);
        expect(await screen.findByText(/nenhuma remoção desde que o servidor ligou/i)).toBeInTheDocument();
    });
});
