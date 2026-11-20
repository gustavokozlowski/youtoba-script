import { ApiErrorNotice } from '../../shared/ui/ApiErrorNotice';
import type { LoadErrorProps } from './ReviewScreen.types';

export function LoadError({ error, onRetry }: LoadErrorProps) {
    return (
        <ApiErrorNotice
            error={error}
            fallbackTitle="Não consegui ler a playlist"
            quotaTitle="Sem cota para ler a playlist agora"
            onRetry={onRetry}
            notFound={{
                code: 'playlist_not_found',
                title: 'Playlist não encontrada',
                message: 'Ela pode ter sido apagada ou ficado inacessível para esta conta.',
                tone: 'error',
            }}
        />
    );
}
