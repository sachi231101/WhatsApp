import axios from 'axios';
import { KnowledgeSourceProcessor, ProcessSourceInput, ExtractedDocument } from './types';
import { TextNormalizer } from '../normalizer';

export class UrlProcessor implements KnowledgeSourceProcessor {
  readonly supportedType = 'URL';

  /**
   * Validates URL against SSRF vulnerabilities (blocks loopback, private CIDRs, cloud metadata).
   */
  static validateUrlSafety(rawUrl: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error(`Invalid URL format: "${rawUrl}"`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Forbidden protocol: "${parsed.protocol}". Only HTTP and HTTPS are allowed.`);
    }

    const host = parsed.hostname.toLowerCase().trim();

    // Block localhost and internal domains
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === 'metadata.google.internal'
    ) {
      throw new Error(`Access to local or internal domain "${host}" is forbidden for security.`);
    }

    // Check for IP addresses (IPv4 & IPv6)
    if (this.isPrivateOrLoopbackIp(host)) {
      throw new Error(`Access to private, loopback, or metadata IP address "${host}" is forbidden.`);
    }

    return parsed;
  }

  private static isPrivateOrLoopbackIp(host: string): boolean {
    // Clean IPv6 brackets if present: [::1] -> ::1
    const cleanHost = host.replace(/^\[|\]$/g, '');

    // IPv6 checks
    if (cleanHost === '::1' || cleanHost === '0:0:0:0:0:0:0:1') return true;
    if (cleanHost.startsWith('fc') || cleanHost.startsWith('fd') || cleanHost.startsWith('fe80')) return true;

    // IPv4 checks
    const ipv4Parts = cleanHost.split('.');
    if (ipv4Parts.length === 4 && ipv4Parts.every((p) => /^\d+$/.test(p))) {
      const [a, b, c, d] = ipv4Parts.map((p) => parseInt(p, 10));

      if (a < 0 || a > 255 || b < 0 || b > 255 || c < 0 || c > 255 || d < 0 || d > 255) {
        return true;
      }

      // 127.0.0.0/8 (Loopback)
      if (a === 127) return true;
      // 0.0.0.0/8 (Current network)
      if (a === 0) return true;
      // 10.0.0.0/8 (Private)
      if (a === 10) return true;
      // 172.16.0.0/12 (Private)
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.168.0.0/16 (Private)
      if (a === 192 && b === 168) return true;
      // 169.254.0.0/16 (Link-local & AWS/GCP Metadata)
      if (a === 169 && b === 254) return true;
      // 100.64.0.0/10 (Carrier-grade NAT)
      if (a === 100 && b >= 64 && b <= 127) return true;
      // 224.0.0.0/4 (Multicast) or 240.0.0.0/4 (Reserved)
      if (a >= 224) return true;
    }

    return false;
  }

  /**
   * Cleans and extracts readable article/body text from raw HTML.
   */
  static extractTextFromHtml(html: string): string {
    if (!html) return '';

    // 1. Remove scripts, styles, noscript, svg, canvas, forms
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    clean = clean.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
    clean = clean.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
    clean = clean.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
    clean = clean.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');
    clean = clean.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');

    // 2. Replace structural block tags with newlines
    clean = clean.replace(/<\/(h[1-6]|p|div|section|article|li|tr|blockquote)>/gi, '\n\n');
    clean = clean.replace(/<br\s*[\/]?>/gi, '\n');
    clean = clean.replace(/<hr\s*[\/]?>/gi, '\n---\n');

    // 3. Remove all remaining HTML tags
    clean = clean.replace(/<[^>]+>/g, ' ');

    // 4. Decode common HTML entities
    clean = clean
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    return TextNormalizer.normalize(clean);
  }

  async process(input: ProcessSourceInput): Promise<ExtractedDocument> {
    const urlString = input.sourceUrl || input.name;
    if (!urlString) {
      throw new Error('URL source requires a valid sourceUrl');
    }

    // SSRF Security Check
    const parsedUrl = UrlProcessor.validateUrlSafety(urlString);

    try {
      const response = await axios.get(parsedUrl.href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WazziApp-KnowledgeBot/1.0',
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
        },
        timeout: 10000, // 10s timeout
        maxContentLength: 5 * 1024 * 1024, // 5MB max
        maxRedirects: 3,
        responseType: 'text',
      });

      const rawHtml = String(response.data || '');
      const content = UrlProcessor.extractTextFromHtml(rawHtml);
      const tokenCount = TextNormalizer.estimateTokenCount(content);

      // Extract title from HTML if possible
      const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;

      return {
        title: pageTitle || input.name || parsedUrl.hostname,
        content,
        language: 'en',
        characterCount: content.length,
        tokenCount,
        metadata: {
          ...input.metadata,
          sourceName: input.name,
          sourceUrl: parsedUrl.href,
          type: 'URL',
        },
        status: 'READY',
      };
    } catch (err: any) {
      throw new Error(`Failed to fetch and process URL "${parsedUrl.href}": ${err.message}`);
    }
  }
}
