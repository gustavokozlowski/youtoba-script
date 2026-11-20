import { ChangedNotice } from './ChangedNotice';
import { DeletedRemovePanel } from './DeletedRemovePanel';
import { EmptyReview } from './EmptyReview';
import { LoadErrorNotice } from './LoadErrorNotice';
import { ReviewHeader } from './ReviewHeader';
import { ReviewLayout } from './ReviewLayout';
import type { ReviewScreenProps } from './ReviewScreen.types';
import { TrackSearchList } from './TrackSearchList';
import { useDeletedReviewScreen } from './use-deleted-review-screen';

/** A revisão dos vídeos apagados: o mesmo esqueleto da revisão de repetidos, com os dados e o painel deles. */
export function DeletedReviewScreen({ playlistId }: ReviewScreenProps) {
    const { title, preview, loadError, changed, confirmRef, goToConfirm, reloadAfterChange, refetch } =
        useDeletedReviewScreen(playlistId);

    return (
        <ReviewLayout
            count={preview?.apagados}
            header={
                <ReviewHeader
                    playlistId={playlistId}
                    title={title}
                    loadError={loadError}
                    trio={
                        preview && {
                            total: preview.totalItens,
                            leaving: preview.apagados,
                            staying: preview.totalItens - preview.apagados,
                            leavingLabel: 'apagados saem',
                        }
                    }
                    notice={changed && preview && <ChangedNotice count={preview.apagados} noun="vídeos apagados" />}
                />
            }
            error={loadError && <LoadErrorNotice error={loadError} onRetry={() => void refetch()} />}
            empty={<EmptyReview title="Nada para tirar">Nenhum vídeo apagado nesta playlist.</EmptyReview>}
            list={
                preview && (
                    <TrackSearchList
                        items={preview.itensApagados}
                        noun="apagados"
                        heading="Vídeos apagados que saem"
                        onGoToConfirm={goToConfirm}
                    />
                )
            }
            panel={
                preview && (
                    <DeletedRemovePanel
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
