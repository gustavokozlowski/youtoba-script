import { describe, expect, it } from 'vitest';
import { planMix } from '../src/modules/mix/mix-plan';
import type { PlaylistEntry } from '../src/modules/playlist/playlist.types';
import type { EntryOptions } from './mix-plan.types';

const entry = (videoId: string, position: number, options: EntryOptions = {}): PlaylistEntry => ({
    playlistItemId: `item-${videoId}-${position}`,
    videoId,
    title: options.title ?? `Title ${videoId}`,
    position,
    ...(options.unavailable ? { unavailable: options.unavailable } : {}),
});

const positions = (entries: PlaylistEntry[]) => entries.map((item) => item.position);

describe('planMix', () => {
    it('adds everything available and unique when the target is empty', () => {
        const plan = planMix([entry('a', 0), entry('b', 1)], []);
        expect(positions(plan.toAdd)).toEqual([0, 1]);
        expect(plan.skipped).toEqual({ alreadyInTarget: [], repeatedInSource: [], unavailable: [] });
    });

    it('returns everything empty for an empty source', () => {
        const plan = planMix([], [entry('a', 0)]);
        expect(plan).toEqual({ toAdd: [], skipped: { alreadyInTarget: [], repeatedInSource: [], unavailable: [] } });
    });

    it('skips videos whose videoId is already in the target', () => {
        const plan = planMix([entry('a', 0), entry('b', 1)], [entry('a', 5)]);
        expect(positions(plan.toAdd)).toEqual([1]);
        expect(positions(plan.skipped.alreadyInTarget)).toEqual([0]);
    });

    it('skips later copies of a video repeated in the source, reporting the first position', () => {
        const plan = planMix([entry('a', 0), entry('b', 1), entry('a', 2), entry('a', 7)], []);
        expect(positions(plan.toAdd)).toEqual([0, 1]);
        expect(plan.skipped.repeatedInSource.map((item) => [item.position, item.firstPosition])).toEqual([
            [2, 0],
            [7, 0],
        ]);
    });

    it('sends deleted and private source entries to unavailable', () => {
        const plan = planMix(
            [entry('a', 0, { unavailable: 'deleted' }), entry('b', 1, { unavailable: 'private' }), entry('c', 2)],
            [],
        );
        expect(positions(plan.toAdd)).toEqual([2]);
        expect(positions(plan.skipped.unavailable)).toEqual([0, 1]);
    });

    it('treats a source entry as unavailable even when its videoId is in the target (rule 1 wins)', () => {
        const plan = planMix([entry('a', 0, { unavailable: 'deleted' })], [entry('a', 0)]);
        expect(positions(plan.skipped.unavailable)).toEqual([0]);
        expect(plan.skipped.alreadyInTarget).toEqual([]);
    });

    it('counts a target entry that is itself unavailable as already in the target', () => {
        const plan = planMix([entry('a', 0)], [entry('a', 3, { unavailable: 'private' })]);
        expect(plan.toAdd).toEqual([]);
        expect(positions(plan.skipped.alreadyInTarget)).toEqual([0]);
    });

    it('treats the same title with a different videoId as different videos', () => {
        const plan = planMix(
            [entry('a', 0, { title: 'Same' }), entry('b', 1, { title: 'Same' })],
            [entry('c', 0, { title: 'Same' })],
        );
        expect(positions(plan.toAdd)).toEqual([0, 1]);
    });

    it('sends both copies to alreadyInTarget when the first copy is already in the target (rule 2 before 3)', () => {
        const plan = planMix([entry('a', 0), entry('a', 1)], [entry('a', 0)]);
        expect(plan.toAdd).toEqual([]);
        expect(positions(plan.skipped.alreadyInTarget)).toEqual([0, 1]);
        expect(plan.skipped.repeatedInSource).toEqual([]);
    });

    it('adds the available copy when a deleted copy of the same videoId comes first', () => {
        const plan = planMix([entry('a', 0, { unavailable: 'deleted' }), entry('a', 1)], []);
        expect(positions(plan.skipped.unavailable)).toEqual([0]);
        expect(positions(plan.toAdd)).toEqual([1]);
        expect(plan.skipped.repeatedInSource).toEqual([]);
    });

    it('processes the source by position even when the input is unsorted', () => {
        const plan = planMix([entry('a', 4), entry('b', 1), entry('a', 2)], []);
        expect(positions(plan.toAdd)).toEqual([1, 2]);
        expect(plan.skipped.repeatedInSource.map((item) => [item.position, item.firstPosition])).toEqual([[4, 2]]);
    });

    it('keeps every bucket in source position order', () => {
        const plan = planMix(
            [
                entry('x', 9, { unavailable: 'deleted' }),
                entry('t', 8),
                entry('a', 6),
                entry('x', 1, { unavailable: 'private' }),
                entry('t', 3),
                entry('a', 5),
            ],
            [entry('t', 0)],
        );
        expect(positions(plan.toAdd)).toEqual([5]);
        expect(positions(plan.skipped.alreadyInTarget)).toEqual([3, 8]);
        expect(positions(plan.skipped.unavailable)).toEqual([1, 9]);
        expect(positions(plan.skipped.repeatedInSource)).toEqual([6]);
    });

    it('puts every source entry in exactly one bucket', () => {
        const source = [
            entry('a', 0),
            entry('a', 1),
            entry('b', 2),
            entry('c', 3, { unavailable: 'deleted' }),
            entry('d', 4),
            entry('e', 5),
            entry('e', 6, { unavailable: 'private' }),
        ];
        const plan = planMix(source, [entry('d', 0)]);
        const { alreadyInTarget, repeatedInSource, unavailable } = plan.skipped;
        const all = [...plan.toAdd, ...alreadyInTarget, ...repeatedInSource, ...unavailable];
        expect(all).toHaveLength(source.length);
        expect(new Set(all.map((item) => item.playlistItemId)).size).toBe(source.length);
    });

    it('does not mutate the input arrays', () => {
        const source = [entry('b', 3), entry('a', 1)];
        const target = [entry('z', 2), entry('y', 0)];
        const sourceBefore = [...source];
        const targetBefore = [...target];
        planMix(source, target);
        expect(source).toEqual(sourceBefore);
        expect(target).toEqual(targetBefore);
        expect(source.map((item) => item.videoId)).toEqual(['b', 'a']);
    });
});
