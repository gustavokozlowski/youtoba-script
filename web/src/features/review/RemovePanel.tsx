import { useStartRemoval } from '../../shared/api/queries';
import { num } from '../../shared/lib/format';
import { Icon } from '../../shared/ui/Icon';
import { ConfirmRemovalPanel } from './ConfirmRemovalPanel';
import type { RemovePanelProps } from './ReviewScreen.types';
import { useRemovalConfirmation } from './use-removal-confirmation';

/** A remoção de repetidos: a nota de segurança diz que dá para desfazer. */
export function RemovePanel({ preview, playlistId, onChanged, confirmRef }: RemovePanelProps) {
    const confirmation = useRemovalConfirmation(preview.duplicados, useStartRemoval(playlistId), onChanged);
    return (
        <ConfirmRemovalPanel
            heading="Remover repetidos"
            quota={preview.quota}
            quotaHoje={preview.quotaHoje}
            cabemHoje={preview.cabemHoje}
            confirmation={confirmation}
            submitLabel={`Remover ${num(preview.duplicados)} repetidos`}
            confirmRef={confirmRef}
            safety={
                <p className="safe">
                    <Icon name="shield" />
                    Antes de apagar, a playlist inteira vai para a pasta backups/. Dá para desfazer.
                </p>
            }
        />
    );
}
