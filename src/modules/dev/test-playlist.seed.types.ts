export type SeedResult =
    | { status: 'exists'; playlistId: string }
    | {
          status: 'created';
          playlistId: string;
          inserted: { position: number; videoId: string }[];
          failed: { position: number; videoId: string; reason: string }[];
      };
