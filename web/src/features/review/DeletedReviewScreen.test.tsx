import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, quota } from '../../test/fake-api';
import { render } from '../../test/render';
import { DeletedReviewScreen } from './DeletedReviewScreen';

const READ = '/playlist/PLrap/unavailable';
const REMOVE = 'DELETE /playlist/PLrap/remove-unavailable?confirm=3';

const deletedItem = (k: number) => ({
    posicao: 10 + k,
    titulo: `Deleted video ${k}`,
    canal: 'Canal',
    videoId: `dead${k}`,
    playlistItemId: `it-${k}`,
});

const preview = (n = 3) => ({
    playlistId: 'PLrap',
    totalItens: 338,
    apagados: n,
    itensApagados: Array.from({ length: n }, (_, k) => deletedItem(k)),
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
    aviso: 'Vídeos adicionados depois não aparecem aqui.',
});

const job = {
    jobId: 'job-7',
    playlistId: 'PLrap',
    tipo: 'apagados',
    status: 'running',
    situacao: 'em andamento',
    progresso: '0 de 3 itens apagados',
    percentual: 0,
    removidos: 0,
    total: 3,
    pendentes: 3,
    falhas: [],
    iniciadoEm: '2026-11-19T10:00:00.000Z',
    backup: 'backups/PLrap.json',
    restaurar: 'npm run restore:playlist -- backups/PLrap.json',
    itens: [],
    quotaHoje: quota,
};

afterEach(() => vi.restoreAllMocks());

describe('DeletedReviewScreen', () => {
    it('shows the counts and lists each deleted video with its position and title', async () => {
        fakeApi({ [READ]: { body: preview() }, '/quota': { body: quota } });
        render(<DeletedReviewScreen playlistId="PLrap" />);

        await screen.findByRole('button', { name: /remover 3 vídeos apagados/i });
        expect(screen.getByText('338')).toBeInTheDocument(); // vídeos agora
        expect(screen.getByText('335')).toBeInTheDocument(); // ficam
        expect(screen.getByText('Deleted video 0')).toBeInTheDocument();
        expect(screen.getByText('Deleted video 2')).toBeInTheDocument();
    });

    it('warns that deleted videos cannot come back and does not offer an undo', async () => {
        fakeApi({ [READ]: { body: preview() } });
        render(<DeletedReviewScreen playlistId="PLrap" />);

        await screen.findByRole('button', { name: /remover 3 vídeos apagados/i });
        expect(screen.getByText(/não volta|não podem voltar/i)).toBeInTheDocument();
        expect(screen.queryByText(/restore:playlist/i)).toBeNull();
        expect(screen.queryByText(/desfazer/i)).toBeNull();
    });

    it('keeps the remove button disabled until the exact number is typed', async () => {
        fakeApi({ [READ]: { body: preview() } });
        render(<DeletedReviewScreen playlistId="PLrap" />);

        const button = await screen.findByRole('button', { name: /remover 3 vídeos apagados/i });
        expect(button).toBeDisabled();
        const input = screen.getByLabelText(/digite 3 para confirmar/i);
        await userEvent.type(input, '2');
        expect(button).toBeDisabled();
        await userEvent.clear(input);
        await userEvent.type(input, '3');
        expect(button).toBeEnabled();
    });

    it('sends the confirmation and opens the removal progress screen', async () => {
        const fetchMock = fakeApi({ [READ]: { body: preview() }, [REMOVE]: { status: 202, body: job } });
        render(<DeletedReviewScreen playlistId="PLrap" />);
        await userEvent.type(await screen.findByLabelText(/digite 3 para confirmar/i), '3');
        await userEvent.click(screen.getByRole('button', { name: /remover 3 vídeos apagados/i }));

        await waitFor(() => expect(window.location.hash).toBe('#/remocao/job-7'));
        expect(fetchMock).toHaveBeenCalledWith(
            '/playlist/PLrap/remove-unavailable?confirm=3',
            expect.objectContaining({ method: 'DELETE' }),
        );
    });

    it('when the playlist changed, reloads the preview and tells the user', async () => {
        let reads = 0;
        fakeApi({
            [READ]: () => ({ body: preview(++reads === 1 ? 3 : 2) }),
            [REMOVE]: { status: 409, body: { erro: 'confirmation_required', mensagem: 'Confira os 2 apagados' } },
        });
        render(<DeletedReviewScreen playlistId="PLrap" />);
        await userEvent.type(await screen.findByLabelText(/digite 3 para confirmar/i), '3');
        await userEvent.click(screen.getByRole('button', { name: /remover 3 vídeos apagados/i }));

        expect(await screen.findByText(/a playlist mudou/i)).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /remover 2 vídeos apagados/i })).toBeDisabled();
    });

    it('when a removal is already running for this playlist, opens it', async () => {
        fakeApi({
            [READ]: { body: preview() },
            [REMOVE]: { status: 409, body: { erro: 'already_running', jobId: 'job-9' } },
        });
        render(<DeletedReviewScreen playlistId="PLrap" />);
        await userEvent.type(await screen.findByLabelText(/digite 3 para confirmar/i), '3');
        await userEvent.click(screen.getByRole('button', { name: /remover 3 vídeos apagados/i }));

        await waitFor(() => expect(window.location.hash).toBe('#/remocao/job-9'));
    });

    it('with no deleted videos, shows the empty state with a link back to the playlists', async () => {
        fakeApi({ [READ]: { body: preview(0) } });
        render(<DeletedReviewScreen playlistId="PLrap" />);

        expect(await screen.findByText(/nenhum vídeo apagado/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /remover/i })).toBeNull();
        expect(screen.getByRole('link', { name: /voltar às playlists/i })).toHaveAttribute('href', '#/playlists');
    });

    it('going back soon after does not read the playlist again (saves quota)', async () => {
        const fetchMock = fakeApi({ [READ]: { body: preview() } });
        const { unmount, client } = render(<DeletedReviewScreen playlistId="PLrap" />);
        await screen.findByRole('button', { name: /remover 3 vídeos apagados/i });
        unmount();

        render(<DeletedReviewScreen playlistId="PLrap" />, client);
        expect(screen.getByRole('button', { name: /remover 3 vídeos apagados/i })).toBeInTheDocument();
        expect(fetchMock.mock.calls.filter(([url]) => url === READ)).toHaveLength(1);
    });
});
