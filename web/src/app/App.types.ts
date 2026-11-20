import type { Route } from './router.types';

export interface ServerDownProps {
    onRetry: () => void;
}

export interface ScreenProps {
    route: Route;
}
