import { ApiErrorNotice } from '../../shared/ui/ApiErrorNotice';
import { Notice } from '../../shared/ui/Notice';
import type { AnalysisErrorProps, PlaylistNoticesProps } from './PlaylistsScreen.types';

export function AnalysisError({ error, onRetry }: AnalysisErrorProps) {
    return (
        <ApiErrorNotice
            error={error}
            fallbackTitle="Não consegui analisar suas playlists"
            quotaTitle="Sem cota para analisar agora"
            onRetry={onRetry}
        />
    );
}

export function PlaylistNotices({ overview, error, onRetry }: PlaylistNoticesProps) {
    return (
        <>
            {error && <AnalysisError error={error} onRetry={onRetry} />}
            {overview?.resumo.aviso && (
                <Notice tone="warn" title="Lista incompleta">
                    {overview.resumo.aviso}
                </Notice>
            )}
            {overview && overview.resumo.falhas.length > 0 && (
                <Notice tone="warn" title="Algumas playlists não puderam ser lidas">
                    {overview.resumo.falhas.map((f) => f.titulo).join(', ')}.
                </Notice>
            )}
        </>
    );
}
