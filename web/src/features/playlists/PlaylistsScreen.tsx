import { PlaylistHeader } from './PlaylistHeader';
import { PlaylistList } from './PlaylistList';
import { PlaylistListSkeleton } from './PlaylistListSkeleton';
import { PlaylistNotices } from './PlaylistNotices';
import { usePlaylistsScreen } from './use-playlists-screen';

export function PlaylistsScreen() {
    const { overview, error, loading, dataUpdatedAt, analyze } = usePlaylistsScreen();
    return (
        <main>
            <PlaylistHeader overview={overview} loading={loading} dataUpdatedAt={dataUpdatedAt} onAnalyze={analyze} />
            <PlaylistNotices overview={overview} error={error} onRetry={analyze} />
            {!overview && loading && <PlaylistListSkeleton />}
            {overview && <PlaylistList overview={overview} />}
        </main>
    );
}
