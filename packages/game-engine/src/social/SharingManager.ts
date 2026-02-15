import type { ISocialProvider, ShareableResult, ShareLink } from './ISocialProvider.js';

export class SharingManager {
  private provider: ISocialProvider;

  constructor(provider: ISocialProvider) {
    this.provider = provider;
  }

  async share(result: ShareableResult): Promise<ShareLink> {
    return this.provider.shareResult(result);
  }

  /** Copy a share link to clipboard. */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  /** Use Web Share API if available (mobile). */
  async nativeShare(title: string, text: string, url: string): Promise<boolean> {
    if (!navigator.share) return false;
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      return false;
    }
  }
}
