import type { ReactNode } from 'react';

export interface NoticeProps {
    tone: 'warn' | 'error';
    title: string;
    children?: ReactNode;
    action?: ReactNode;
}
