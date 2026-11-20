import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app';

describe('health check', () => {
    it('reports the local server as ready', async () => {
        const response = await request(createApp({ webDist: '/does-not-exist' })).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });
});
