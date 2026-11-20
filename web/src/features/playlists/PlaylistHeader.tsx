import { num, savedAtLabel } from '../../shared/lib/format';
import { Icon } from '../../shared/ui/Icon';
import { PlaylistSummary } from './PlaylistSummary';
import type { PlaylistHeaderProps } from './PlaylistsScreen.types';

export function PlaylistHeader({ overview, loading, dataUpdatedAt, onAnalyze }: PlaylistHeaderProps) {
    return (
        <div className="head">
            <div>
                <h1>Suas playlists</h1>
                {overview ? (
                    <PlaylistSummary overview={overview} />
                ) : (
                    <p className="lead">
                        {loading
                            ? 'Procurando vídeos repetidos em todas as suas playlists…'
                            : 'Ainda não deu para analisar suas playlists.'}
                    </p>
                )}
            </div>
            <div className="head-actions">
                <button type="button" className="btn btn-ghost" onClick={onAnalyze} disabled={loading}>
                    <Icon name="refresh" className={loading ? 'spin' : ''} />
                    {loading ? 'Analisando…' : overview ? 'Analisar de novo' : 'Analisar'}
                    {overview && !loading && <small>~{num(overview.resumo.custoDestaAnalise)} un.</small>}
                </button>
                {overview && <span className="stamp">Análise das {savedAtLabel(dataUpdatedAt)}</span>}
            </div>
        </div>
    );
}
