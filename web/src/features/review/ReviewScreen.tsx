import { ApiErrorNotice } from '../../shared/ui/ApiErrorNotice';
import { DuplicateList } from './DuplicateList';
import { EmptyReview } from './EmptyReview';
import { RemovePanel } from './RemovePanel';
import { ReviewHeader } from './ReviewHeader';
import type { ReviewScreenProps } from './ReviewScreen.types';
import { useReviewScreen } from './use-review-screen';

export function ReviewScreen({ playlistId }: ReviewScreenProps) {
    const { title, preview, loadError, changed, confirmRef, goToConfirm, reloadAfterChange, refetch } =
        useReviewScreen(playlistId);

    return (
        <main>
            <ReviewHeader
                playlistId={playlistId}
                title={title}
                preview={preview}
                loadError={loadError}
                changed={changed}
            />
            {loadError && (
                <ApiErrorNotice
                    error={loadError}
                    fallbackTitle="Não consegui ler a playlist"
                    quotaTitle="Sem cota para ler a playlist agora"
                    onRetry={() => void refetch()}
                    notFound={{
                        code: 'playlist_not_found',
                        title: 'Playlist não encontrada',
                        message: 'Ela pode ter sido apagada ou ficado inacessível para esta conta.',
                        tone: 'error',
                    }}
                />
            )}
            {preview && preview.duplicados === 0 && <EmptyReview />}
            {preview && preview.duplicados > 0 && (
                <div className="cols">
                    <DuplicateList preview={preview} onGoToConfirm={goToConfirm} />
                    <RemovePanel
                        preview={preview}
                        playlistId={playlistId}
                        onChanged={reloadAfterChange}
                        confirmRef={confirmRef}
                    />
                </div>
            )}
        </main>
    );
}
