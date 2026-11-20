export type IconName =
    | 'refresh'
    | 'check'
    | 'shield'
    | 'search'
    | 'copy'
    | 'alert'
    | 'back'
    | 'out'
    | 'external'
    | 'google';

export interface IconProps {
    name: IconName;
    className?: string;
}
