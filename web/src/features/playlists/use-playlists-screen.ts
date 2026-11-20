import { useOverview } from '../../shared/api/queries';

export function usePlaylistsScreen() {
    const { data: overview, error, isFetching: loading, dataUpdatedAt, refetch } = useOverview();
    const analyze = () => void refetch();
    return { overview, error, loading, dataUpdatedAt, analyze };
}
