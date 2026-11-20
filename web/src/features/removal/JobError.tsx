import { ApiErrorNotice } from '../../shared/ui/ApiErrorNotice';
import type { JobErrorProps } from './RemovalScreen.types';

export function JobError({ error }: JobErrorProps) {
    return (
        <ApiErrorNotice
            error={error}
            fallbackTitle="Não consegui acompanhar a remoção"
            notFound={{
                code: 'job_not_found',
                title: 'Não encontrei essa remoção',
                message:
                    'O progresso fica na memória do servidor e some quando ele reinicia. O que saiu continua registrado no arquivo de backup, na pasta backups/.',
            }}
        />
    );
}
