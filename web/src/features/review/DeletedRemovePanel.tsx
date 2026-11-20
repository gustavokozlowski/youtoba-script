import { useStartDeletedRemoval } from '../../shared/api/queries';
import { num } from '../../shared/lib/format';
import { Icon } from '../../shared/ui/Icon';
import { ConfirmRemovalPanel } from './ConfirmRemovalPanel';
import type { DeletedRemovePanelProps } from './ReviewScreen.types';
import { useRemovalConfirmation } from './use-removal-confirmation';

/** A remoção de vídeos apagados: não há como devolvê-los, e a nota de segurança diz isso. */
export function DeletedRemovePanel({ preview, playlistId, onChanged, confirmRef }: DeletedRemovePanelProps) {
    const confirmation = useRemovalConfirmation(preview.apagados, useStartDeletedRemoval(playlistId), onChanged);
    return (
        <ConfirmRemovalPanel
            heading="Remover vídeos apagados"
            quota={preview.quota}
            quotaHoje={preview.quotaHoje}
            cabemHoje={preview.cabemHoje}
            confirmation={confirmation}
            submitLabel={`Remover ${num(preview.apagados)} vídeos apagados`}
            confirmRef={confirmRef}
            safety={
                <p className="safe">
                    <Icon name="shield" />
                    Vídeos apagados não voltam: o YouTube não deixa adicionar de novo. O backup registra o que saiu.
                </p>
            }
        />
    );
}
