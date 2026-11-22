import type { YoutubeClient } from '../../infra/youtube/youtube.client';
import type { AddVideosResult } from '../../infra/youtube/youtube-api.types';
import type { JobFailure, JobReply, JobStatus, JobStopReason } from '../jobs/job.types';
import type { PlaylistJob } from '../jobs/job-store.types';
import type { DuplicateEntry, PlaylistEntry, ReadFailure } from '../playlist/playlist.types';
import type { QuotaSnapshot, WriteQuotaEstimate } from '../quota/quota.types';
import type { QuotaTracker } from '../quota/quota-tracker.service';

export interface MixSkipped {
    /** Mesmo videoId que já está na playlist de destino. */
    alreadyInTarget: PlaylistEntry[];
    /** Cópia posterior de um vídeo que aparece antes na origem (só a primeira entra). `firstPosition` = posição dessa primeira cópia na origem. */
    repeatedInSource: DuplicateEntry[];
    /** Apagado ou privado na origem (`entry.unavailable` preenchido). Nunca é adicionado. */
    unavailable: PlaylistEntry[];
}

export interface MixPlan {
    /** Entradas da origem que serão anexadas ao destino, na ordem da origem (por posição). */
    toAdd: PlaylistEntry[];
    skipped: MixSkipped;
}

/** Resultado da classificação de uma entrada da origem. */
export type MixBucket = 'toAdd' | 'unavailable' | 'alreadyInTarget' | 'repeatedInSource';

/** Os dois ids de um Mix, já validados. */
export interface MixIds {
    sourceId: string;
    targetId: string;
}

/** Ids válidos, ou a resposta 400 pronta. */
export type MixIdsCheck = { ids: MixIds } | { reply: JobReply };

/** O dry-run: o que entra, o que é pulado, quanto custa e quanto cabe no saldo de hoje. */
export interface MixPreview extends MixIds {
    sourceCount: number;
    targetCount: number;
    plan: MixPlan;
    quota: WriteQuotaEstimate;
    quotaToday: QuotaSnapshot;
    /** Quantos dos vídeos que entram cabem no saldo de hoje. */
    fitToday: number;
}

export type MixPreviewResult = ReadFailure | ({ status: 'ok' } & MixPreview);

export type MixStartResult =
    | ReadFailure
    | { status: 'already_running'; job: PlaylistJob }
    | { status: 'budget_exhausted'; quota: QuotaSnapshot }
    | ({ status: 'nothing_to_add' } & MixPreview)
    | ({ status: 'confirmation_required' } & MixPreview)
    | ({ status: 'started'; job: MixJob } & MixPreview);

/** O que o início do Mix devolve depois de a leitura ter dado certo. */
export type MixStartOutcome = Exclude<MixStartResult, ReadFailure>;

/** As duas playlists lidas, com o client que as leu (a escrita reaproveita o mesmo). */
export type MixReadResult =
    | ReadFailure
    | { status: 'ok'; client: YoutubeClient; source: PlaylistEntry[]; target: PlaylistEntry[] };

export type MixAddedVideo = AddVideosResult['added'][number];

export interface MixJob {
    id: string;
    /** O destino: é nele que o job bloqueia outros jobs. */
    playlistId: string;
    sourceId: string;
    kind: 'mix';
    status: JobStatus;
    stopReason?: JobStopReason;
    total: number;
    /** Os vídeos que este Mix vai adicionar, na ordem em que são tentados. */
    items: PlaylistEntry[];
    /** Itens já tentados (adicionados ou com falha). */
    processed: number;
    added: MixAddedVideo[];
    failed: JobFailure[];
    lastItem?: { title: string; position: number; outcome: 'added' | 'failed' };
    startedAt: string;
    finishedAt?: string;
    recordFile: string;
    error?: string;
}

/** Dados para começar um Mix em segundo plano. */
export interface StartMixParams extends MixIds {
    items: PlaylistEntry[];
    recordFile: string;
    client: YoutubeClient;
    tracker: QuotaTracker;
}

/** O arquivo de registro em BACKUP_DIR: é dele que o desfazer sabe o que entrou. */
export interface MixRecord {
    version: 1;
    kind: 'mix';
    sourceId: string;
    targetId: string;
    createdAt: string;
    planned: PlaylistEntry[];
    added: MixAddedVideo[];
    failed: JobFailure[];
    updatedAt?: string;
    finishedAt?: string;
}
