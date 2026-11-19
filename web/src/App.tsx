import { useCallback, useEffect, useState } from 'react';
import type { AuthStatus } from './api/api.types';
import { ApiError, api, UNAUTHORIZED_EVENT } from './api/client';
import { Notice } from './components/Notice';
import { TopBar } from './components/TopBar';
import { clearOverview } from './lib/overview-cache';
import { useRoute } from './lib/router';
import { Entrar } from './screens/Entrar';
import { Playlists } from './screens/Playlists';

type Session = 'checking' | 'connected' | 'signed-out' | 'expired' | 'offline';

export function App() {
    const route = useRoute();
    const [session, setSession] = useState<Session>('checking');
    const [signingOut, setSigningOut] = useState(false);

    const check = useCallback(() => {
        setSession('checking');
        api.get<AuthStatus>('/auth/status')
            .then(({ connected }) => setSession(connected ? 'connected' : 'signed-out'))
            .catch((e) => setSession(e instanceof ApiError && e.code !== 'offline' ? 'signed-out' : 'offline'));
    }, []);

    useEffect(check, []);

    // Qualquer 401 no meio do uso: o login expirou (modo Testing do Google: 7 dias).
    useEffect(() => {
        const onUnauthorized = () => {
            clearOverview();
            setSession('expired');
        };
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, []);

    const signOut = async () => {
        setSigningOut(true);
        try {
            await api.send('POST', '/auth/logout');
        } finally {
            clearOverview();
            setSigningOut(false);
            setSession('signed-out');
        }
    };

    if (session === 'checking') return <main aria-busy="true" />;
    if (session === 'offline') {
        return (
            <main>
                <Notice
                    tone="error"
                    title="O servidor do youtoba não respondeu"
                    action={
                        <button type="button" className="btn btn-ghost btn-sm" onClick={check}>
                            Tentar de novo
                        </button>
                    }
                >
                    Confira se o npm run dev está rodando neste computador.
                </Notice>
            </main>
        );
    }
    if (session !== 'connected') return <Entrar expired={session === 'expired'} />;

    return (
        <>
            <TopBar route={route} onSignOut={signOut} signingOut={signingOut} />
            <Screen route={route} />
        </>
    );
}

function Screen({ route }: { route: ReturnType<typeof useRoute> }) {
    switch (route.name) {
        default:
            return <Playlists />;
    }
}
