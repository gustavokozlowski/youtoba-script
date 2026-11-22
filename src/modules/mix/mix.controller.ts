import type { Request } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import { parseConfirm } from '../jobs/confirm';
import type { JobReply } from '../jobs/job.types';
import { alreadyRunningReply, budgetExhaustedReply, sendReply } from '../jobs/job-replies';
import { isPlaylistId } from '../playlist/playlist-id';
import { isReadFailure, sendReadFailure } from '../playlist/read-failure';
import { quotaTracker } from '../quota/quota-tracker.service';
import { formatMixJob, formatMixPreview, formatMixSides } from './mix.formatter';
import { MixService } from './mix.service';
import type { MixIdsCheck, MixStartOutcome } from './mix.types';

const mixes = new MixService();

/** Valida os dois ids antes de qualquer chamada ao YouTube. */
function checkIds(req: Request): MixIdsCheck {
    const sourceId: unknown = req.query.origem;
    const targetId: unknown = req.params.playlistId;
    if (!isPlaylistId(sourceId) || !isPlaylistId(targetId)) {
        const mensagem = 'Informe ?origem=<id> e use ids de playlist válidos (letras, números, _ e -).';
        return { reply: [400, { erro: 'playlist_invalida', mensagem }] };
    }
    if (sourceId === targetId) {
        return { reply: [400, { erro: 'mesma_playlist', mensagem: 'A origem e o destino precisam ser diferentes.' }] };
    }
    return { ids: { sourceId, targetId } };
}

/** Status HTTP e corpo de cada resultado da tentativa de começar o Mix. */
function startReply(result: MixStartOutcome): JobReply {
    switch (result.status) {
        case 'already_running':
            return alreadyRunningReply(result.job);
        case 'budget_exhausted':
            return budgetExhaustedReply(result.quota, 'adicionar');
        case 'nothing_to_add':
            return [200, { mensagem: 'Nada novo para adicionar.', adicionados: 0, ...formatMixSides(result) }];
        case 'confirmation_required': {
            const n = result.plan.toAdd.length;
            const mensagem = `Confira os ${n} vídeos abaixo e repita com ?confirm=${n}. Nada foi adicionado.`;
            return [409, { erro: 'confirmation_required', mensagem, ...formatMixPreview(result) }];
        }
        case 'started':
            return [
                202,
                {
                    mensagem: 'Mix iniciado.',
                    cabemHoje: result.fitToday,
                    acompanhar: `/jobs/${result.job.id}`,
                    ...formatMixJob(result.job, quotaTracker().snapshot()),
                },
            ];
    }
}

export const previewMix = asyncHandler(async (req, res) => {
    const checked = checkIds(req);
    if ('reply' in checked) return sendReply(res, checked.reply);

    const result = await mixes.preview(checked.ids);
    if (isReadFailure(result)) return sendReadFailure(res, result);
    return res.status(200).json(formatMixPreview(result));
});

export const startMix = asyncHandler(async (req, res) => {
    const checked = checkIds(req);
    if ('reply' in checked) return sendReply(res, checked.reply);

    const result = await mixes.start(checked.ids, parseConfirm(req.query.confirm));
    if (isReadFailure(result)) return sendReadFailure(res, result);
    return sendReply(res, startReply(result));
});
