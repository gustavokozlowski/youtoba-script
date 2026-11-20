import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, overview, quota, rapNacional } from '../../test/fake-api';
import { render } from '../../test/render';
import { PlaylistsScreen } from './PlaylistsScreen';

afterEach(() => vi.restoreAllMocks());

describe('PlaylistsScreen', () => {
    it('analisa na primeira visita e mostra antes → depois, repetidos, custo e o link de revisão', async () => {
        const fetchMock = fakeApi({ '/playlist/with-duplicates': { body: overview() }, '/quota': { body: quota } });
        render(<PlaylistsScreen />);

        const row = (await screen.findByRole('link', { name: 'rap nacional 2000s' })).closest('li') as HTMLElement;
        expect(row).toHaveTextContent('de 338');
        expect(row).toHaveTextContent('para 263');
        expect(row).toHaveTextContent('75repetidos · 22,2%');
        expect(row).toHaveTextContent('cabe hoje');
        expect(screen.getByRole('link', { name: /revisar rap nacional 2000s/i })).toHaveAttribute('href', '#/p/PLrap');
        expect(screen.getByText(/outras 4 playlists não têm/i)).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith('/playlist/with-duplicates', expect.anything());
    });

    it('com análise guardada nesta aba, não gasta cota de novo até pedirem', async () => {
        sessionStorage.setItem(
            'youtoba:overview',
            JSON.stringify({ overview: overview(), savedAt: new Date().toISOString() }),
        );
        const fetchMock = fakeApi({ '/playlist/with-duplicates': { body: overview([]) }, '/quota': { body: quota } });
        render(<PlaylistsScreen />);
        expect(screen.getByRole('link', { name: 'rap nacional 2000s' })).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalledWith('/playlist/with-duplicates', expect.anything());

        await userEvent.click(screen.getByRole('button', { name: /analisar de novo/i }));
        expect(await screen.findByRole('heading', { name: /tudo limpo/i })).toBeInTheDocument();
    });

    it('playlist que não cabe na cota de um dia mostra quantos dias leva', async () => {
        const grande = { ...rapNacional, duplicados: 230, custoRemocao: { unidades: 11_500, cabeHoje: false } };
        fakeApi({ '/playlist/with-duplicates': { body: overview([grande]) }, '/quota': { body: quota } });
        render(<PlaylistsScreen />);
        expect(await screen.findByText('2 dias de cota')).toBeInTheDocument();
    });

    it('sem cota para a análise, explica com a mensagem do servidor', async () => {
        fakeApi({
            '/playlist/with-duplicates': {
                status: 429,
                body: {
                    erro: 'daily_budget_exhausted',
                    mensagem: 'A análise custaria cerca de 14 unidades e o saldo de hoje é de 0 unidades.',
                },
            },
            '/quota': { body: quota },
        });
        render(<PlaylistsScreen />);
        await waitFor(() => expect(screen.getByText(/sem cota para analisar agora/i)).toBeInTheDocument());
        expect(screen.getByText(/custaria cerca de 14 unidades/)).toBeInTheDocument();
    });
});

describe('Playlists depois de uma remoção', () => {
    it('com a análise marcada como desatualizada, mostra a antiga e analisa de novo sozinho', async () => {
        sessionStorage.setItem(
            'youtoba:overview',
            JSON.stringify({ overview: overview(), savedAt: new Date().toISOString(), stale: true }),
        );
        fakeApi({ '/playlist/with-duplicates': { body: overview([]) }, '/quota': { body: quota } });
        render(<PlaylistsScreen />);
        expect(screen.getByRole('link', { name: 'rap nacional 2000s' })).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: /tudo limpo/i })).toBeInTheDocument();
    });
});
