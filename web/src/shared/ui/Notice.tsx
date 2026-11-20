import type { NoticeProps } from './Notice.types';

export function Notice({ tone, title, children, action }: NoticeProps) {
    return (
        <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
            <strong>{title}</strong>
            {children && <p>{children}</p>}
            {action}
        </div>
    );
}
