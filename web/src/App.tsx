import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { UNAUTHORIZED_EVENT } from './api/client';
import { signedOut, useAuthStatus, useSignOut } from './api/queries';
import { Notice } from './components/Notice';
import { TopBar } from './components/TopBar';
import { useRoute } from './lib/router';
import { Entrar } from './screens/Entrar';
import { Playlists } from './screens/Playlists';
import { Remocao } from './screens/Remocao';
import { Remocoes } from './screens/Remocoes';
import { Revisao } from './screens/Revisao';

export function App() {
    const route = useRoute();
    const auth = useAuthStatus();
    const expired = useSessionExpiry();
    const signOut = useSignOut();

    if (auth.isPending) return <main aria-busy="true" />;
    if (auth.error?.code === 'offline') return <ServerDown onRetry={() => void auth.refetch()} />;
    if (expired || !auth.data?.connected) return <Entrar expired={expired} />;

    return (
        <>
            <TopBar route={route} onSignOut={() => signOut.mutate()} signingOut={signOut.isPending} />
            <Screen route={route} />
        </>
    );
}

/** Qualquer 401 no meio do uso: o login expirou (modo Testing do Google: 7 dias). */
function useSessionExpiry() {
    const client = useQueryClient();
    const [expired, setExpired] = useState(false);
    useEffect(() => {
        const onUnauthorized = () => {
            signedOut(client);
            setExpired(true);
        };
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, [client]);
    return expired;
}

function ServerDown({ onRetry }: { onRetry: () => void }) {
    return (
        <main>
            <Notice
                tone="error"
                title="O servidor do youtoba não respondeu"
                action={
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
                        Tentar de novo
                    </button>
                }
            >
                Confira se o npm run dev está rodando neste computador.
            </Notice>
        </main>
    );
}

function Screen({ route }: { route: ReturnType<typeof useRoute> }) {
    switch (route.name) {
        case 'revisao':
            return <Revisao key={route.playlistId} playlistId={route.playlistId} />;
        case 'remocao':
            return <Remocao key={route.jobId} jobId={route.jobId} />;
        case 'remocoes':
            return <Remocoes />;
        default:
            return <Playlists />;
    }
}
