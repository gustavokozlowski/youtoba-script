import { describe, expect, it } from 'vitest';
import { daysLabel, num, units } from './format';
import { readOverview, saveOverview } from './overview-cache';
import { parseRoute } from './router';

describe('format', () => {
    it('números no padrão brasileiro', () => {
        expect(num(16050)).toBe('16.050');
    });
    it('unidade no singular e no plural', () => {
        expect(units(1)).toBe('1 unidade');
        expect(units(3750)).toBe('3.750 unidades');
    });
    it('dias de cota', () => {
        expect(daysLabel(1)).toBe('1 dia de cota');
        expect(daysLabel(2)).toBe('2 dias de cota');
    });
});

describe('parseRoute', () => {
    it('reconhece as telas pelo hash', () => {
        expect(parseRoute('')).toEqual({ name: 'playlists' });
        expect(parseRoute('#/playlists')).toEqual({ name: 'playlists' });
        expect(parseRoute('#/p/PLabc_-1')).toEqual({ name: 'revisao', playlistId: 'PLabc_-1' });
        expect(parseRoute('#/remocao/1a2b-3c')).toEqual({ name: 'remocao', jobId: '1a2b-3c' });
        expect(parseRoute('#/remocoes')).toEqual({ name: 'remocoes' });
    });
    it('hash desconhecido ou com caracteres estranhos cai na lista', () => {
        expect(parseRoute('#/p/<script>')).toEqual({ name: 'playlists' });
        expect(parseRoute('#/qualquer')).toEqual({ name: 'playlists' });
    });
});

describe('cache da análise', () => {
    it('guarda e devolve a última análise com a data', () => {
        saveOverview({ playlists: [], resumo: {}, quotaHoje: {} } as never, new Date('2026-11-19T10:00:00Z'));
        expect(readOverview()?.savedAt).toBe('2026-11-19T10:00:00.000Z');
    });
    it('sem nada salvo (ou storage bloqueado), devolve undefined', () => {
        expect(readOverview()).toBeUndefined();
    });
});
