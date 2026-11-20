import { useRef, useState } from 'react';
import { href } from '../../shared/lib/route-links';
import { Icon } from '../../shared/ui/Icon';
import type { AsidePanelProps } from './RemovalScreen.types';

export function UndoPanel({ job, panelRef, onRestore, restoring }: AsidePanelProps) {
    const [copied, setCopied] = useState<'idle' | 'copied' | 'select'>('idle');
    const commandRef = useRef<HTMLElement>(null);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(job.restaurar);
            setCopied('copied');
        } catch {
            const range = document.createRange();
            if (commandRef.current) range.selectNodeContents(commandRef.current);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
            setCopied('select');
        }
        window.setTimeout(() => setCopied('idle'), 2_000);
    };

    return (
        <aside className="panel" aria-label="Se precisar desfazer" ref={panelRef}>
            <h2>Se precisar desfazer</h2>
            <p className="safe">
                <Icon name="shield" />A playlist original está salva. A restauração devolve os vídeos às posições de
                antes, e pode rodar mais de uma vez sem duplicar nada.
            </p>
            <code className="command" ref={commandRef}>
                {job.restaurar}
            </code>
            <button
                type="button"
                className="btn btn-primary"
                onClick={onRestore}
                disabled={restoring || job.status === 'running'}
            >
                {restoring ? 'Restaurando…' : 'Restaurar vídeos removidos'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={copy}>
                <Icon name={copied === 'copied' ? 'check' : 'copy'} />
                {copied === 'copied' ? 'Copiado' : copied === 'select' ? 'Selecionado, use Ctrl+C' : 'Copiar comando'}
            </button>
            {job.status !== 'running' && (
                <a className="btn btn-primary" href={href.playlists()}>
                    Voltar às playlists
                </a>
            )}
        </aside>
    );
}
