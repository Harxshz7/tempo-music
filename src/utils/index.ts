// Utility functions for Tempo Music
import subsonic from '../api/subsonic';

/**
 * Build a Subsonic cover art URL from a cover art id.
 *
 * Cover art URLs embed the auth token and salt, so they are derived on demand
 * from the id rather than being stored on persisted objects such as queued
 * tracks. Returns `undefined` when there is no id or the server isn't configured
 * (callers render their placeholder artwork in that case).
 */
export function coverArtUrlFor(coverArtId?: string | null): string | undefined {
  if (!coverArtId) return undefined;
  try {
    return subsonic.getCoverArtUrl(coverArtId);
  } catch {
    return undefined;
  }
}
