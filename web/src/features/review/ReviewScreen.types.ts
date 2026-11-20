import type { ReactNode, RefObject } from 'react';
import type {
    DeletedItem,
    DuplicatesPreview,
    QuotaSnapshot,
    RemovalQuotaEstimate,
    UnavailablePreview,
} from '../../shared/api/api.types';
import type { ApiError } from '../../shared/api/client';
import type { RemovalConfirmation } from './use-removal-confirmation.types';

export interface ReviewScreenProps {
    playlistId: string;
}

/** Os três números do topo da revisão e o que o segundo conta (repetidos ou apagados). */
export interface TrioProps {
    total: number;
    leaving: number;
    staying: number;
    leavingLabel: string;
}

/** Os painéis de remoção de cada tipo: a prévia, a playlist e o que fazer quando ela mudou. */
export interface RemovePanelProps {
    preview: DuplicatesPreview;
    playlistId: string;
    onChanged: () => void;
    confirmRef: RefObject<HTMLInputElement | null>;
}

export interface DeletedRemovePanelProps {
    preview: UnavailablePreview;
    playlistId: string;
    onChanged: () => void;
    confirmRef: RefObject<HTMLInputElement | null>;
}

export interface ConfirmRemovalPanelProps {
    heading: string;
    quota: RemovalQuotaEstimate;
    quotaHoje: QuotaSnapshot;
    cabemHoje: number;
    confirmation: RemovalConfirmation;
    /** Texto do botão de enviar, já com a contagem. */
    submitLabel: string;
    /** A nota de segurança do tipo de remoção (backup, se dá para desfazer ou não). */
    safety: ReactNode;
    confirmRef: RefObject<HTMLInputElement | null>;
}

export interface ReviewHeaderProps {
    playlistId: string;
    title: string;
    /** Sem números ainda: mostra o esqueleto, a menos que a leitura tenha falhado. */
    trio: TrioProps | undefined;
    loadError: ApiError | null;
    /** Aviso de "a playlist mudou", quando houver. */
    notice?: ReactNode;
}

export interface ChangedNoticeProps {
    count: number;
    /** O que se conta, no plural: "repetidos", "vídeos apagados". */
    noun: string;
}

export interface EmptyReviewProps {
    title: string;
    children: ReactNode;
}

export interface DeletedLinkProps {
    playlistId: string;
    count: number;
}

export interface TrackSearchListProps {
    items: (DeletedItem & { primeiraOcorrencia?: number })[];
    /** O que a lista guarda, no plural: "repetidos", "vídeos apagados". */
    noun: string;
    /** Título (só para leitor de tela) da lista, ex. "Repetidos que saem". */
    heading: string;
    onGoToConfirm: () => void;
}

export interface FitToday {
    text: string;
    tone: 'yes' | 'partial';
}

export interface LoadErrorNoticeProps {
    error: ApiError;
    onRetry: () => void;
}

export interface ReviewLayoutProps {
    header: ReactNode;
    /** O aviso de erro de leitura, quando houver. */
    error?: ReactNode;
    /** Quantos itens saem; `undefined` enquanto a prévia carrega. */
    count: number | undefined;
    /** Mostrado quando `count` é 0. */
    empty: ReactNode;
    /** Lista e painel, mostrados lado a lado quando `count` é maior que 0. */
    list: ReactNode;
    panel: ReactNode;
}
