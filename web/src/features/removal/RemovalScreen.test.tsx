import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, quota } from '../../test/fake-api';
import { render } from '../../test/render';
import { RemovalScreen } from './RemovalScreen';

const job = (overrides: Record<string, unknown> = {}) => ({
    jobId: 'job-1',
    playlistId: 'PLrap',
    tipo: 'duplicados',
    status: 'done',
    situacao: 'concluída',
    progresso: '2 de 2 itens apagados',
    percentual: 100,
    removidos: 2,
    total: 2,
    pendentes: 0,
    falhas: [],
    iniciadoEm: '2026-11-19T10:00:00.000Z',
    backup: 'backups/PLrap.json',
    restaurar: 'npm run restore:playlist -- backups/PLrap.json',
    itens: [0, 1].map((k) => ({
        posicao: k,
        titulo: `Faixa ${k}`,
        canal: 'Canal',
        videoId: `vid${k}`,
        playlistItemId: `it-${k}`,
        primeiraOcorrencia: 0,
        estado: 'apagado',
    })),
    quotaHoje: quota,
    ...overrides,
});

afterEach(() => vi.restoreAllMocks());

describe('RemovalScreen by job type', () => {
    it('for deleted videos, offers no restore and says they cannot come back', async () => {
        fakeApi({ '/jobs/job-1': { body: job({ tipo: 'apagados' }) }, '/quota': { body: quota } });
        render(<RemovalScreen jobId="job-1" />);

        expect(await screen.findByText(/não volta|não podem voltar/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /restaurar vídeos removidos/i })).toBeNull();
        expect(screen.queryByText(/restore:playlist/i)).toBeNull();
        expect(screen.getByRole('link', { name: /voltar às playlists/i })).toHaveAttribute('href', '#/playlists');
    });

    it('for duplicates, keeps the undo panel with the restore button and command', async () => {
        fakeApi({ '/jobs/job-1': { body: job() }, '/quota': { body: quota } });
        render(<RemovalScreen jobId="job-1" />);

        expect(await screen.findByRole('button', { name: /restaurar vídeos removidos/i })).toBeInTheDocument();
        expect(screen.getByText('npm run restore:playlist -- backups/PLrap.json')).toBeInTheDocument();
    });
});
