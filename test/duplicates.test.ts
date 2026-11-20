import { describe, expect, it } from 'vitest';
import { findDuplicates, toEntries } from '../src/modules/playlist/duplicates';
import type { PlaylistEntry } from '../src/modules/playlist/playlist.types';
import { playlistItem } from './helpers/youtube-fixtures';

const entry = (position: number, videoId: string): PlaylistEntry => ({
    playlistItemId: `item-${position}`,
    videoId,
    title: `vídeo ${videoId}`,
    position,
});

describe('findDuplicates (mesmo videoId)', () => {
    it('lista vazia não tem duplicados', () => {
        expect(findDuplicates([])).toEqual({ unique: [], duplicates: [] });
    });

    it('playlist sem repetição não tem duplicados', () => {
        const { unique, duplicates } = findDuplicates([entry(0, 'a'), entry(1, 'b'), entry(2, 'c')]);
        expect(unique).toHaveLength(3);
        expect(duplicates).toEqual([]);
    });

    it('vídeo triplicado: fica a primeira ocorrência, as outras duas saem', () => {
        const { unique, duplicates } = findDuplicates([entry(0, 'b'), entry(1, 'a'), entry(2, 'b'), entry(3, 'b')]);
        expect(unique.map((e) => e.position)).toEqual([0, 1]);
        expect(duplicates.map((d) => [d.position, d.firstPosition])).toEqual([
            [2, 0],
            [3, 0],
        ]);
    });

    it('decide pela posição na playlist, não pela ordem em que os itens chegaram', () => {
        const { duplicates } = findDuplicates([entry(5, 'a'), entry(1, 'a')]);
        expect(duplicates).toEqual([{ ...entry(5, 'a'), firstPosition: 1 }]);
    });

    it('não considera duplicados vídeos diferentes com o mesmo título', () => {
        const sameTitle = [
            { ...entry(0, 'a'), title: 'Intro' },
            { ...entry(1, 'b'), title: 'Intro' },
        ];
        expect(findDuplicates(sameTitle).duplicates).toEqual([]);
    });

    it('ignora itens sem videoId ao converter da API', () => {
        const entries = toEntries([playlistItem({ id: 'i1', videoId: 'a' }), playlistItem({ id: 'i2' })]);
        expect(entries.map((e) => e.playlistItemId)).toEqual(['i1']);
    });

    it('processa 10.000 itens em menos de 50 ms', () => {
        const big = Array.from({ length: 10_000 }, (_, i) => entry(i, `v${i % 5_000}`));
        const start = performance.now();
        const { duplicates } = findDuplicates(big);
        const elapsed = performance.now() - start;
        expect(duplicates).toHaveLength(5_000);
        expect(elapsed).toBeLessThan(50);
    });
});
