import type { RemovalJob } from '../../shared/api/api.types';
import type { RemovalWindow } from './RemovalScreen.types';

const WINDOW_BEFORE = 4;
const WINDOW_SIZE = 9;

export function useRemovalWindow(job: RemovalJob): RemovalWindow {
    const running = job.status === 'running';
    const errors = job.falhas.filter((failure) => !failure.reason?.startsWith('skipped_')).length;
    const current = running ? job.itens.find((item) => item.estado === 'pendente') : undefined;
    const doneCount = job.itens.findIndex((item) => item.estado === 'pendente');
    const start = Math.max(0, (doneCount === -1 ? job.itens.length : doneCount) - WINDOW_BEFORE);
    const rows = running ? job.itens.slice(start, start + WINDOW_SIZE) : job.itens;
    return { running, errors, current, rows };
}
