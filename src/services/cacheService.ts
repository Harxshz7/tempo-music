import { cacheDirectory, getInfoAsync, downloadAsync, makeDirectoryAsync } from 'expo-file-system/legacy';

const COVER_ART_DIR = `${cacheDirectory || ''}cover_art/`;

// Simple hash function for image URL filenames
function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

class CacheService {
  private isDirectoryCreated = false;

  private async ensureDirExists(): Promise<void> {
    if (this.isDirectoryCreated || !cacheDirectory) return;
    try {
      const dirInfo = await getInfoAsync(COVER_ART_DIR);
      if (!dirInfo.exists) {
        await makeDirectoryAsync(COVER_ART_DIR, { intermediates: true });
      }
      this.isDirectoryCreated = true;
    } catch {
      // Ignore directory creation failure
    }
  }

  /**
   * Retrieves local cached URI for an image URL, or downloads and caches it locally.
   * On failure or missing cache directory, gracefully falls back to remote URL.
   */
  async getOrCacheImage(url?: string | null): Promise<string | undefined> {
    if (!url) return undefined;
    if (url.startsWith('file://') || url.startsWith('data:')) return url;
    if (!cacheDirectory) return url;

    try {
      await this.ensureDirExists();
      const filename = `${hashUrl(url)}.jpg`;
      const localUri = `${COVER_ART_DIR}${filename}`;

      const fileInfo = await getInfoAsync(localUri);
      if (fileInfo.exists) {
        return localUri;
      }

      const downloadResult = await downloadAsync(url, localUri);
      if (downloadResult && downloadResult.status === 200) {
        return downloadResult.uri;
      }
    } catch (err) {
      console.warn('[CacheService] Failed to cache image, using remote URL:', err);
    }

    return url;
  }
}

export const cacheService = new CacheService();
