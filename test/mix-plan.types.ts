import type { Availability } from '../src/modules/playlist/playlist.types';

export interface EntryOptions {
    unavailable?: Availability;
    title?: string;
}
