import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

describe('parseRoute', () => {
    it('reconhece as telas pelo hash', () => {
        expect(parseRoute('')).toEqual({ name: 'playlists' });
        expect(parseRoute('#/playlists')).toEqual({ name: 'playlists' });
        expect(parseRoute('#/p/PLabc_-1')).toEqual({ name: 'review', playlistId: 'PLabc_-1' });
        expect(parseRoute('#/remocao/1a2b-3c')).toEqual({ name: 'removal', jobId: '1a2b-3c' });
        expect(parseRoute('#/remocoes')).toEqual({ name: 'removals' });
    });

    it('hash desconhecido ou com caracteres estranhos cai na lista', () => {
        expect(parseRoute('#/p/<script>')).toEqual({ name: 'playlists' });
        expect(parseRoute('#/qualquer')).toEqual({ name: 'playlists' });
    });
});
