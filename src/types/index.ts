/** Server credentials stored in AsyncStorage */
export interface ServerConfig {
  serverUrl: string;
  username: string;
  token: string;
  salt: string;
}

/** Subsonic artist response */
export interface Artist {
  id: string;
  name: string;
  albumCount?: number;
  artistImageUrl?: string;
  starred?: string;
}

/** Subsonic album response */
export interface Album {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  songCount?: number;
  duration?: number;
  playCount?: number;
  created?: string;
  starred?: string;
}

/** Subsonic song/track response */
export interface Song {
  id: string;
  title: string;
  artist?: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  coverArt?: string;
  duration?: number;
  track?: number;
  year?: number;
  genre?: string;
  bitRate?: number;
  size?: number;
  path?: string;
  playCount?: number;
  starred?: string;
}

/** Subsonic playlist response */
export interface Playlist {
  id: string;
  name: string;
  comment?: string;
  owner?: string;
  public?: boolean;
  songCount?: number;
  duration?: number;
  created?: string;
  changed?: string;
}

/** Subsonic API response wrapper */
export interface SubsonicResponse<T = unknown> {
  'subsonic-response': {
    status: 'ok' | 'failed';
    version: string;
    error?: {
      code: number;
      message: string;
    };
  } & T;
}

/** Artist index (for getArtists) */
export interface ArtistIndex {
  ignoredArticles?: string;
  index: {
    name: string;
    artist: Artist[];
  }[];
}

/** Album list type options */
export type AlbumListType =
  | 'newest'
  | 'recent'
  | 'frequent'
  | 'random'
  | 'starred'
  | 'alphabeticalByArtist'
  | 'alphabeticalByName'
  | 'byYear'
  | 'byGenre'
  | 'played'
  | 'mostPlayed';

/** Search results */
export interface SearchResults {
  artist?: { artist: Artist[] };
  album?: { album: Album[] };
  song?: { song: Song[] };
}
