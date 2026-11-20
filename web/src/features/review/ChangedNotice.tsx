import { num } from '../../shared/lib/format';
import { Notice } from '../../shared/ui/Notice';
import type { ChangedNoticeProps } from './ReviewScreen.types';

export function ChangedNotice({ count, noun }: ChangedNoticeProps) {
    return (
        <Notice tone="warn" title="A playlist mudou desde a revisão">
            Agora são {num(count)} {noun}. Confira a lista de novo antes de confirmar.
        </Notice>
    );
}
