import { describe, expect, it } from 'vitest';
import { parseDriveUploadResult } from '@/services/google/googleDriveMultipart';

describe('googleDriveMultipart', () => {
  it('parses a valid drive upload response', async () => {
    const result = await parseDriveUploadResult({
      json: async () => ({
        id: 'file-123',
        webViewLink: 'https://drive.google.com/file-123',
      }),
    } as Response);

    expect(result).toEqual({
      fileId: 'file-123',
      webViewLink: 'https://drive.google.com/file-123',
    });
  });

  it('rejects malformed drive upload payloads', async () => {
    await expect(
      parseDriveUploadResult({
        json: async () => ({
          id: 'file-123',
        }),
      } as Response)
    ).rejects.toThrow();
  });
});
