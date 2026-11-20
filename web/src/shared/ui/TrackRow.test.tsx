import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrackRow } from './TrackRow';

const item = { posicao: 3, videoId: 'abc', titulo: 'Video', canal: 'Canal' } as Parameters<typeof TrackRow>[0]['item'];

describe('TrackRow', () => {
    it('shows the aria-hidden buff only on removed rows', () => {
        const { container, rerender } = render(<TrackRow item={item} state="apagado" />);
        const mark = container.querySelector('.buff');
        expect(mark).toHaveAttribute('aria-hidden', 'true');
        rerender(<TrackRow item={item} state="pendente" />);
        expect(container.querySelector('.buff')).toBeNull();
    });
});
