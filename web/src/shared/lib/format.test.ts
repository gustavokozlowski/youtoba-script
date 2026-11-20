import { describe, expect, it } from 'vitest';
import { daysLabel, num, quantity, units } from './format';
import { readOverview, saveOverview } from './overview-cache';

describe('format', () => {
    it('números no padrão brasileiro', () => {
        expect(num(16050)).toBe('16.050');
    });
    it('não transforma números inválidos em NaN ou em negativo', () => {
        expect(num(Number.NaN)).toBe('0');
        expect(num(-2)).toBe('0');
    });
    it('unidade no singular e no plural', () => {
        expect(quantity(1, 'vídeo', 'vídeos')).toBe('1 vídeo');
        expect(quantity(0, 'vídeo', 'vídeos')).toBe('0 vídeos');
        expect(quantity(1200, 'vídeo', 'vídeos')).toBe('1.200 vídeos');
        expect(units(1)).toBe('1 unidade');
        expect(units(3750)).toBe('3.750 unidades');
    });
    it('dias de cota', () => {
        expect(daysLabel(1)).toBe('1 dia de cota');
        expect(daysLabel(2)).toBe('2 dias de cota');
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
