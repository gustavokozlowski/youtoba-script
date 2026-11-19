import { useEffect, useState } from 'react';

export type Route =
    | { name: 'playlists' }
    | { name: 'revisao'; playlistId: string }
    | { name: 'remocao'; jobId: string }
    | { name: 'remocoes' };

// Ids do YouTube e UUIDs dos jobs: letras, números, - e _.
const ID = '([A-Za-z0-9_-]{1,128})';
const PATTERNS: [RegExp, (match: RegExpMatchArray) => Route][] = [
    [new RegExp(`^#/p/${ID}$`), (m) => ({ name: 'revisao', playlistId: m[1] })],
    [new RegExp(`^#/remocao/${ID}$`), (m) => ({ name: 'remocao', jobId: m[1] })],
    [/^#\/remocoes$/, () => ({ name: 'remocoes' })],
];

export function parseRoute(hash: string): Route {
    for (const [pattern, build] of PATTERNS) {
        const match = hash.match(pattern);
        if (match) return build(match);
    }
    return { name: 'playlists' };
}

export const href = {
    playlists: () => '#/playlists',
    review: (playlistId: string) => `#/p/${playlistId}`,
    removal: (jobId: string) => `#/remocao/${jobId}`,
    removals: () => '#/remocoes',
};

export function useRoute(): Route {
    const [route, setRoute] = useState(() => parseRoute(window.location.hash));
    useEffect(() => {
        const onChange = () => {
            setRoute(parseRoute(window.location.hash));
            window.scrollTo(0, 0);
        };
        window.addEventListener('hashchange', onChange);
        return () => window.removeEventListener('hashchange', onChange);
    }, []);
    return route;
}
