import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom não implementa rolagem.
window.scrollTo = () => undefined;

afterEach(() => {
    cleanup();
    sessionStorage.clear();
    window.location.hash = '';
});
