import { num } from '../../shared/lib/format';
import { Notice } from '../../shared/ui/Notice';
import type { StopNoticeProps } from './RemovalScreen.types';

export function StopNotice({ job, errors }: StopNoticeProps) {
    if (job.status === 'done') {
        return (
            <Notice
                tone="warn"
                title={`${num(job.removidos)} ${job.removidos === 1 ? 'vídeo repetido saiu' : 'vídeos repetidos saíram'}`}
            >
                A primeira vez de cada vídeo continua na playlist, na ordem de antes.
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
