import { num } from '../../shared/lib/format';
import type { SummaryProps } from './PlaylistsScreen.types';

export function PlaylistSummary({ overview: { resumo } }: SummaryProps) {
    return (
        <div className="summary">
            <div>
                <strong className="num">{num(resumo.comDuplicados)}</strong>
                <span>com repetidos</span>
            </div>
            <div>
                <strong className="num">{num(resumo.totalDuplicados)}</strong>
                <span>vídeos repetidos</span>
            </div>
            <div>
                <strong className="num">{num(resumo.custoTotalRemocao)}</strong>
                <span>unidades para limpar tudo</span>
            </div>
        </div>
    );
}
