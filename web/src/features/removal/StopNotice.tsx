import { num } from '../../shared/lib/format';
import { Notice } from '../../shared/ui/Notice';
import type { StopNoticeProps } from './RemovalScreen.types';
import { KIND_COPY, kindOf } from './removal-kind-copy';

export function StopNotice({ job, errors }: StopNoticeProps) {
    if (job.status === 'done') {
        const copy = KIND_COPY[kindOf(job.tipo)];
        return (
            <Notice tone="warn" title={copy.doneTitle(job.removidos)}>
                {copy.doneNote}
            </Notice>
        );
    }
    if (job.motivoParada) {
        return (
            <Notice tone="warn" title="A cota de hoje acabou">
                Parou com segurança antes de o Google recusar. {job.proximoPasso} Ela continua de onde parou.
            </Notice>
        );
    }
    if (job.status === 'failed') {
        return (
            <Notice tone="error" title="Algo deu errado no meio do caminho">
                {job.erro ?? 'Erro desconhecido.'} O que já saiu está registrado no backup.
            </Notice>
        );
    }
    if (errors > 0 && job.status === 'partial') {
        return (
            <Notice tone="error" title={`${num(errors)} ${errors === 1 ? 'item não saiu' : 'itens não saíram'}`}>
                O YouTube recusou esses itens. Rode a remoção de novo para tentar outra vez.
            </Notice>
        );
    }
    return null;
}
