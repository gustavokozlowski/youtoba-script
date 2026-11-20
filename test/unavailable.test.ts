import { describe, expect, it } from 'vitest';
import { toEntry } from '../src/modules/playlist/duplicates';
import type { PlaylistEntry } from '../src/modules/playlist/playlist.types';
import { availabilityOf, findDeleted } from '../src/modules/playlist/unavailable';
import { playlistItem } from './helpers/youtube-fixtures';
import type { PlaylistItemFixture } from './helpers/youtube-fixtures.types';

const PUBLISHED = '2020-01-01T00:00:00Z';

const entryFrom = (fixture: PlaylistItemFixture): PlaylistEntry => {
    const entry = toEntry(playlistItem(fixture), fixture.position ?? 0);
    if (!entry) throw new Error('fixture without videoId');
    return entry;
};

describe('availabilityOf', () => {
    it('flags a "Deleted video" without publish date as deleted', () => {
        expect(availabilityOf(playlistItem({ videoId: 'a', title: 'Deleted video' }))).toBe('deleted');
    });

    it('flags a "Private video" without publish date as private', () => {
        expect(availabilityOf(playlistItem({ videoId: 'a', title: 'Private video' }))).toBe('private');
    });

    it('treats a missing contentDetails as no publish date', () => {
        expect(availabilityOf(playlistItem({ title: 'Deleted video' }))).toBe('deleted');
    });

    it('is fail-safe: a real video titled "Deleted video" (has publish date) is available', () => {
        expect(
            availabilityOf(playlistItem({ videoId: 'a', title: 'Deleted video', videoPublishedAt: PUBLISHED })),
        ).toBe(undefined);
        expect(
            availabilityOf(playlistItem({ videoId: 'a', title: 'Private video', videoPublishedAt: PUBLISHED })),
        ).toBe(undefined);
    });

    it('matches the title exactly', () => {
        expect(availabilityOf(playlistItem({ videoId: 'a', title: 'deleted video' }))).toBeUndefined();
        expect(availabilityOf(playlistItem({ videoId: 'a', title: 'Deleted video (live)' }))).toBeUndefined();
        expect(availabilityOf(playlistItem({ videoId: 'a', title: 'Hit' }))).toBeUndefined();
    });
});

describe('toEntry', () => {
    it('sets unavailable only when the item is deleted or private', () => {
        expect(entryFrom({ videoId: 'a', title: 'Deleted video' }).unavailable).toBe('deleted');
        expect(entryFrom({ videoId: 'b', title: 'Private video' }).unavailable).toBe('private');
        expect('unavailable' in entryFrom({ videoId: 'c', title: 'Hit' })).toBe(false);
    });
});

describe('findDeleted', () => {
    it('returns only deleted entries, sorted by position, leaving private and regular ones', () => {
        const entries = [
            entryFrom({ videoId: 'r', position: 0 }),
            entryFrom({ videoId: 'd2', position: 4, title: 'Deleted video' }),
            entryFrom({ videoId: 'p', position: 2, title: 'Private video' }),
            entryFrom({ videoId: 'd1', position: 1, title: 'Deleted video' }),
        ];
        expect(findDeleted(entries).map((entry) => entry.position)).toEqual([1, 4]);
    });

    it('never lists a deleted video that is also a duplicate: only the first copy goes to the deleted list', () => {
        const entries = [
            entryFrom({ id: 'first', videoId: 'x', position: 1, title: 'Deleted video' }),
            entryFrom({ id: 'copy', videoId: 'x', position: 5, title: 'Deleted video' }),
        ];
        expect(findDeleted(entries).map((entry) => entry.playlistItemId)).toEqual(['first']);
    });

    it('returns an empty list when nothing is deleted', () => {
        expect(findDeleted([entryFrom({ videoId: 'a' })])).toEqual([]);
        expect(findDeleted([])).toEqual([]);
    });
});
