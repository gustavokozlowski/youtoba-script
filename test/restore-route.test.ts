import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app';

describe('restauração pela API', () => {
    it('recusa identificadores de backup que poderiam escapar da pasta', async () => {
        const response = await request(createApp({ webDist: '/does-not-exist' }))
            .post('/backups/..%2F.env/restore')
            .set('Host', 'localhost:3000');

        expect(response.status).toBe(400);
        expect(response.body.erro).toBe('backup_invalid');
    });
});
