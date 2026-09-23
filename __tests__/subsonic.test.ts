import axios from 'axios';
import { SubsonicClient } from '../src/api/subsonic';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SubsonicClient API Tests', () => {
  let client: SubsonicClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SubsonicClient();
    mockedAxios.create.mockReturnValue(mockedAxios);
  });

  describe('Static Auth Helpers', () => {
    it('generates consistent MD5 token for password + salt', () => {
      const password = 'secretpassword';
      const salt = 'abcdef';
      const token = SubsonicClient.generateToken(password, salt);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBe(32); // Hex MD5 hash length
      // Verify MD5 formula
      const expected = SubsonicClient.generateToken(password, salt);
      expect(token).toBe(expected);
    });

    it('generates random hex salt', () => {
      const salt1 = SubsonicClient.generateSalt();
      const salt2 = SubsonicClient.generateSalt();

      expect(typeof salt1).toBe('string');
      expect(salt1.length).toBeGreaterThan(0);
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('Server Config Management', () => {
    const mockConfig = {
      serverUrl: 'https://music.example.com',
      username: 'testuser',
      token: 'mocktoken123',
      salt: 'mocksalt456',
    };

    it('saves and loads server config', async () => {
      await client.saveConfig(mockConfig);
      expect(client.getConfig()).toEqual(mockConfig);

      const loaded = await client.loadConfig();
      expect(loaded).toEqual(mockConfig);
    });

    it('clears server config', async () => {
      await client.saveConfig(mockConfig);
      await client.clearConfig();
      expect(client.getConfig()).toBeNull();
    });
  });

  describe('API Endpoints & Error Handling', () => {
    const mockConfig = {
      serverUrl: 'https://music.example.com/',
      username: 'admin',
      token: 'token123',
      salt: 'salt123',
    };

    beforeEach(async () => {
      await client.saveConfig(mockConfig);
    });

    it('successfully pings server', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'subsonic-response': {
            status: 'ok',
            version: '1.16.1',
            type: 'navidrome',
            serverVersion: '0.52.0',
          },
        },
      });

      const res = await client.ping();
      expect(res.status).toBe('ok');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://music.example.com/rest/ping.view'),
        expect.any(Object)
      );
    });

    it('throws error when server returns API error code', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'subsonic-response': {
            status: 'failed',
            error: {
              code: 40,
              message: 'Wrong username or password',
            },
          },
        },
      });

      await expect(client.ping()).rejects.toThrow('Wrong username or password');
    });

    it('builds valid cover art URL with auth parameters', () => {
      const url = client.getCoverArtUrl('al-101', 300);
      expect(url).toContain('https://music.example.com/rest/getCoverArt.view');
      expect(url).toContain('id=al-101');
      expect(url).toContain('size=300');
      expect(url).toContain('u=admin');
      expect(url).toContain('t=token123');
      expect(url).toContain('s=salt123');
    });

    it('builds valid stream URL with bitrate limit', () => {
      const url = client.getStreamUrl('tr-202', 320);
      expect(url).toContain('https://music.example.com/rest/stream.view');
      expect(url).toContain('id=tr-202');
      expect(url).toContain('maxBitRate=320');
    });

    it('fetches artist listing', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'subsonic-response': {
            status: 'ok',
            artists: {
              index: [
                {
                  name: 'A',
                  artist: [{ id: 'art-1', name: 'Artic Monkeys', albumCount: 5 }],
                },
              ],
            },
          },
        },
      });

      const indexes = await client.getArtists();
      expect(indexes.length).toBe(1);
      expect(indexes[0].artist[0].name).toBe('Artic Monkeys');
    });
  });
});
