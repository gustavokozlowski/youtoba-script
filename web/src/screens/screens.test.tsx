import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { UNAUTHORIZED_EVENT } from '../api/client';
import { fakeApi, overview, quota, rapNacional } from '../test/fake-api';
import { render } from '../test/render';
import { Playlists } from './Playlists';

afterEach(() => vi.restoreAllMocks());

describe('App', () => {
    it('desconectado, mostra o login com o Google', async () => {
        fakeApi({ '/auth/status': { body: { connected: false } } });
        render(<App />);
        const link = await screen.findByRole('link', { name: /entrar com o google/i });
        expect(link).toHaveAttribute('href', '/auth/login');
    });

    it('quando a API responde 401 no meio do uso, volta para o login avisando que expirou', async () => {
        fakeApi({ '/auth/status': { body: { connected: true } }, '/quota': { body: quota } });
        sessionStorage.setItem(
            'youtoba:overview',
            JSON.stringify({ overview: overview(), savedAt: new Date().toISOString() }),
        );
        render(<App />);
        await screen.findByRole('heading', { name: /suas playlists/i });

        act(() => window.dispatchEvent(new Event(UNAUTHORIZED_EVENT)));
        expect(await screen.findByText(/o login expirou/i)).toBeInTheDocument();
        expect(sessionStorage.getItem('youtoba:overview')).toBeNull();
    });

    it('Sair desconecta e volta para a tela de entrar', async () => {
        const fetchMock = fakeApi({
            '/auth/status': { body: { connected: true } },
            '/quota': { body: quota },
            '/playlist/with-duplicates': { body: overview() },
            'POST /auth/logout': { body: { mensagem: 'Desconectado.' } },
        });
        render(<App />);
        await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));

        expect(await screen.findByRole('link', { name: /entrar com o google/i })).toBeInTheDocument();
        expect(screen.queryByText(/o login expirou/i)).toBeNull();
        expect(fetchMock).toHaveBeenCalledWith('/auth/logout', expect.objectContaining({ method: 'POST' }));
    });

    it('servidor desligado: diz o que fazer', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        render(<App />);
        expect(await screen.findByText(/não respondeu/i)).toBeInTheDocument();
    });
});

describe('Playlists', () => {
    it('analisa na primeira visita e mostra antes → depois, repetidos, custo e o link de revisão', async () => {
        const fetchMock = fakeApi({ '/playlist/with-duplicates': { body: overview() }, '/quota': { body: quota } });
        render(<Playlists />);

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
        render(<Playlists />);
        expect(screen.getByRole('link', { name: 'rap nacional 2000s' })).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalledWith('/playlist/with-duplicates', expect.anything());

        await userEvent.click(screen.getByRole('button', { name: /analisar de novo/i }));
        expect(await screen.findByRole('heading', { name: /tudo limpo/i })).toBeInTheDocument();
    });

    it('playlist que não cabe na cota de um dia mostra quantos dias leva', async () => {
        const grande = { ...rapNacional, duplicados: 230, custoRemocao: { unidades: 11_500, cabeHoje: false } };
        fakeApi({ '/playlist/with-duplicates': { body: overview([grande]) }, '/quota': { body: quota } });
        render(<Playlists />);
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
        render(<Playlists />);
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
        render(<Playlists />);
        expect(screen.getByRole('link', { name: 'rap nacional 2000s' })).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: /tudo limpo/i })).toBeInTheDocument();
    });
});
