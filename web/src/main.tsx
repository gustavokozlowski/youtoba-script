import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/big-shoulders-display/800';
import '@fontsource/big-shoulders-display/900';
import './styles/tokens.css';
import './styles/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (root) {
    createRoot(root).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}
