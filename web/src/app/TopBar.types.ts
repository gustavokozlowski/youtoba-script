import type { Route } from './router.types';

export interface TopBarProps {
    route: Route;
    onSignOut: () => void;
    signingOut: boolean;
}
