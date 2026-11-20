import { describe, expect, it } from 'vitest';
import { pickThumbnail, summarizePlaylist } from '../src/modules/playlist/playlist-summary';
import { playlist, playlistItem, thumbnail } from './helpers/youtube-fixtures';

const thumb = thumbnail;

const item = (position: number, videoId: string, { title, image }: { title?: string; image?: string } = {}) =>
    playlistItem({ id: `it-${position}`, videoId, position, title, thumbnails: image ? { high: thumb(image) } : {} });

const publishedItem = (position: number, videoId: string, title: string) =>
    playlistItem({ id: `it-${position}`, videoId, position, title, videoPublishedAt: '2020-01-01T00:00:00Z' });

describe('pickThumbnail', () => {
    it('prefere a maior imagem disponível', () => {
        expect(pickThumbnail({ default: thumb('d'), high: thumb('h'), maxres: thumb('m') })).toBe('m');
        expect(pickThumbnail({ default: thumb('d'), medium: thumb('md') })).toBe('md');
        expect(pickThumbnail(undefined)).toBeUndefined();
    });
});

describe('summarizePlaylist', () => {
    it('conta vídeos, duplicados, o que sobra e o custo de remover', () => {
        const summary = summarizePlaylist(playlist(), [item(0, 'a'), item(1, 'b'), item(2, 'a'), item(3, 'c')]);
        expect(summary).toMatchObject({
            totalVideos: 4,
            afterRemoval: 3,
            duplicates: 1,
            duplicatePercent: 25,
            removalCost: 50,
            link: 'https://www.youtube.com/playlist?list=PLx',
        });
    });

    it('usa a capa da playlist quando existe', () => {
        const summary = summarizePlaylist(playlist({ title: 'P', thumbnails: { maxres: thumb('capa') } }), [
            item(0, 'a', { image: 'video-a' }),
        ]);
        expect(summary).toMatchObject({ cover: 'capa', coverSource: 'playlist' });
    });

    it('sem capa da playlist, usa a do primeiro vídeo que tem imagem (pulando vídeos apagados)', () => {
        const summary = summarizePlaylist(playlist(), [
            item(0, 'x', { title: 'Deleted video' }),
            item(1, 'a', { image: 'video-a' }),
            item(2, 'b', { image: 'video-b' }),
        ]);
        expect(summary).toMatchObject({ cover: 'video-a', coverSource: 'first_video' });
    });

    it('sem nenhuma imagem, não inventa capa', () => {
        const summary = summarizePlaylist(playlist(), [item(0, 'a')]);
        expect(summary.cover).toBeUndefined();
        expect(summary.coverSource).toBe('none');
    });

    it('conta itens indisponíveis e lista os vídeos mais repetidos', () => {
        const summary = summarizePlaylist(playlist(), [
            item(0, 'a', { title: 'Hit' }),
            item(1, 'x', { title: 'Deleted video' }),
            item(2, 'y', { title: 'Private video' }),
            item(3, 'a'),
            item(4, 'b'),
            item(5, 'a'),
            item(6, 'b'),
            item(7, 'c'),
            item(8, 'c'),
            item(9, 'd'),
            item(10, 'd'),
        ]);
        expect(summary.unavailable).toBe(2);
        expect(summary.mostRepeated).toHaveLength(3);
        expect(summary.mostRepeated[0]).toEqual({ videoId: 'a', title: 'Hit', copies: 3 });
        expect(summary.duplicatePercent).toBe(45.5);
    });

    it('counts deleted and private items, but not a real video the owner titled "Deleted video"', () => {
        const summary = summarizePlaylist(playlist(), [
            item(0, 'a'),
            item(1, 'x', { title: 'Deleted video' }),
            item(2, 'y', { title: 'Private video' }),
            publishedItem(3, 'z', 'Deleted video'),
        ]);
        expect(summary.unavailable).toBe(2);
    });
});
