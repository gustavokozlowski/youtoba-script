export function PlaylistListSkeleton() {
    return (
        <div className="list" aria-hidden="true">
            {[0, 1, 2].map((k) => (
                <div className="pl" key={k}>
                    <div className="cover skeleton" />
                    <div className="skeleton" style={{ height: 40 }} />
                    <div className="skeleton" style={{ height: 40 }} />
                    <div className="skeleton" style={{ height: 32 }} />
                    <div className="skeleton" style={{ height: 44 }} />
                </div>
            ))}
        </div>
    );
}
