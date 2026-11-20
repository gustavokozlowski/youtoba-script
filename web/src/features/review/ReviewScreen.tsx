import { ChangedNotice } from './ChangedNotice';
import { DeletedLink } from './DeletedLink';
import { EmptyReview } from './EmptyReview';
import { LoadErrorNotice } from './LoadErrorNotice';
import { RemovePanel } from './RemovePanel';
import { ReviewHeader } from './ReviewHeader';
import { ReviewLayout } from './ReviewLayout';
import type { ReviewScreenProps } from './ReviewScreen.types';
import { TrackSearchList } from './TrackSearchList';
import { useReviewScreen } from './use-review-screen';

export function ReviewScreen({ playlistId }: ReviewScreenProps) {
    const { title, preview, loadError, changed, deletedCount, confirmRef, goToConfirm, reloadAfterChange, refetch } =
        useReviewScreen(playlistId);

    return (
        <ReviewLayout
            count={preview?.duplicados}
            header={
                <>
                    <ReviewHeader
                        playlistId={playlistId}
                        title={title}
                        loadError={loadError}
                        trio={
                            preview && {
                                total: preview.totalItens,
                                leaving: preview.duplicados,
                                staying: preview.ficam,
                                leavingLabel: 'repetidos saem',
                            }
                        }
                        notice={changed && preview && <ChangedNotice count={preview.duplicados} noun="repetidos" />}
                    />
                    <DeletedLink playlistId={playlistId} count={deletedCount} />
                </>
            }
            error={loadError && <LoadErrorNotice error={loadError} onRetry={() => void refetch()} />}
            empty={
                <EmptyReview title="Nada para tirar">
                    Nenhum vídeo repetido nesta playlist. Cada vídeo aparece uma vez só.
                </EmptyReview>
            }
            list={
                preview && (
                    <TrackSearchList
                        items={preview.itensDuplicados}
                        noun="repetidos"
                        heading="Repetidos que saem"
                        onGoToConfirm={goToConfirm}
                    />
                )
            }
            panel={
                preview && (
                    <RemovePanel
                        preview={preview}
                        playlistId={playlistId}
                        onChanged={reloadAfterChange}
                        confirmRef={confirmRef}
                    />
                )
            }
        />
    );
}
