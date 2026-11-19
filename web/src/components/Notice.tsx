import type { ReactNode } from 'react';

interface NoticeProps {
    tone: 'warn' | 'error';
    title: string;
    children?: ReactNode;
    action?: ReactNode;
}

export function Notice({ tone, title, children, action }: NoticeProps) {
    return (
        <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
            <strong>{title}</strong>
            {children && <p>{children}</p>}
            {action}
        </div>
    );
}
