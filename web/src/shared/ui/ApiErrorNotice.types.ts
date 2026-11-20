import type { ApiError } from '../api/client';

export interface ApiErrorNoticeProps {
    error: ApiError;
    fallbackTitle: string;
    quotaTitle?: string;
    onRetry?: () => void;
    notFound?: {
        code: string;
        title: string;
        message: string;
        tone?: 'warn' | 'error';
    };
}
