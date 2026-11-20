import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UNAUTHORIZED_EVENT } from '../shared/api/client';
import { fakeApi, overview, quota } from '../test/fake-api';
import { render } from '../test/render';
import { App } from './App';

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
