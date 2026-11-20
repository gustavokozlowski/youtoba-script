import { useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useState } from 'react';
import { SignInScreen } from '../features/auth/SignInScreen';
import { PlaylistsScreen } from '../features/playlists/PlaylistsScreen';
import { RemovalsScreen } from '../features/removal/RemovalsScreen';
import { ReviewScreen } from '../features/review/ReviewScreen';
import { UNAUTHORIZED_EVENT } from '../shared/api/client';
import { signedOut, useAuthStatus, useSignOut } from '../shared/api/queries';
import { Notice } from '../shared/ui/Notice';
import type { ScreenProps, ServerDownProps } from './App.types';
import { useRoute } from './router';
import { TopBar } from './TopBar';

// A remoção ao vivo traz a Motion: só baixa quando alguém abre essa tela.
const RemovalScreen = lazy(() =>
    import('../features/removal/RemovalScreen').then((mod) => ({ default: mod.RemovalScreen })),
);

export function App() {
    const route = useRoute();
    const auth = useAuthStatus();
    const expired = useSessionExpiry();
    const signOut = useSignOut();

    if (auth.isPending) return <main aria-busy="true" />;
    if (auth.error?.code === 'offline') return <ServerDown onRetry={() => void auth.refetch()} />;
    if (expired || !auth.data?.connected) {
        return (
            <div className="screen-transition" key={expired ? 'signin-expired' : 'signin'}>
                <SignInScreen expired={expired} />
            </div>
        );
    }

    return (
        <div className="screen-transition" key={screenKey(route)}>
            <TopBar route={route} onSignOut={() => signOut.mutate()} signingOut={signOut.isPending} />
            <Screen route={route} />
        </div>
    );
}

function screenKey(route: ScreenProps['route']) {
    switch (route.name) {
        case 'review':
            return `${route.name}-${route.playlistId}`;
        case 'removal':
            return `${route.name}-${route.jobId}`;
        default:
            return route.name;
    }
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

function ServerDown({ onRetry }: ServerDownProps) {
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

function Screen({ route }: ScreenProps) {
    switch (route.name) {
        case 'review':
            return <ReviewScreen key={route.playlistId} playlistId={route.playlistId} />;
        case 'removal':
            return (
                <Suspense fallback={<main aria-busy="true" />}>
                    <RemovalScreen key={route.jobId} jobId={route.jobId} />
                </Suspense>
            );
        case 'removals':
            return <RemovalsScreen />;
        default:
            return <PlaylistsScreen />;
    }
}
