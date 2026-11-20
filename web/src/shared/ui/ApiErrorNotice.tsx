import type { ApiErrorNoticeProps } from './ApiErrorNotice.types';
import { Notice } from './Notice';

export function ApiErrorNotice({ error, fallbackTitle, quotaTitle, onRetry, notFound }: ApiErrorNoticeProps) {
    if (notFound && error.code === notFound.code) {
        return (
            <Notice tone={notFound.tone ?? 'warn'} title={notFound.title}>
                {notFound.message}
            </Notice>
        );
    }

    if (error.code === 'daily_budget_exhausted' || error.code === 'quota_exceeded') {
        return (
            <Notice tone="warn" title={quotaTitle ?? fallbackTitle}>
                {error.message}
            </Notice>
        );
    }

    return (
        <Notice
            tone="error"
            title={fallbackTitle}
            action={
                onRetry ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
                        Tentar de novo
                    </button>
                ) : undefined
            }
        >
            {error.message}
        </Notice>
    );
}
