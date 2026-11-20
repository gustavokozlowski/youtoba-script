import type { ReviewLayoutProps } from './ReviewScreen.types';

/**
 * O esqueleto das revisões: topo, erro, e então o estado vazio (sem itens) ou a lista com o painel.
 * `count` é `undefined` enquanto a prévia não chegou.
 */
export function ReviewLayout({ header, error, count, empty, list, panel }: ReviewLayoutProps) {
    return (
        <main>
            {header}
            {error}
            {count === 0 && empty}
            {count !== undefined && count > 0 && (
                <div className="cols">
                    {list}
                    {panel}
                </div>
            )}
        </main>
    );
}
