/**
 * KSA CDN Loader - Load KSA data from CDN instead of filesystem
 * This solves the Cloud Run cold start cost issue
 */

// Use Cloud Storage directly (cheapest option)
const KSA_CDN_BASE = process.env.KSA_CDN_URL ||
  'https://storage.googleapis.com/ai-square-static/ksa';

// Cache loaded KSA data in memory (never expires - static content)
const ksaCache = new Map<string, unknown>();

export async function loadKSAFromCDN(lang: string = 'en'): Promise<unknown> {
  // Check memory cache first
  if (ksaCache.has(lang)) {
    return ksaCache.get(lang);
  }

  try {
    // Normalize language code
    const normalizedLang = lang.replace(/[-_]/g, '');

    // Fetch from CDN
    const url = `${KSA_CDN_BASE}/ksa_codes_${normalizedLang}.json`;
    const response = await fetch(url, {
      // Enable caching headers
      headers: {
        'Cache-Control': 'public, max-age=86400', // 24 hours
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load KSA for ${lang}: ${response.status}`);
    }

    const data = await response.json();

    // Store in memory cache
    ksaCache.set(lang, data);

    return data;
  } catch (error) {
    console.error(`Error loading KSA from CDN for ${lang}:`, error);

    // Fallback to English if language not found
    if (lang !== 'en') {
      return loadKSAFromCDN('en');
    }

    return null;
  }
}

// Preload common languages at startup (optional)
export async function preloadKSAData() {
  const commonLangs = ['en', 'zhTW', 'zhCN', 'ja', 'ko'];

  console.log('Preloading KSA data for common languages...');

  await Promise.all(
    commonLangs.map(lang =>
      loadKSAFromCDN(lang).catch(err =>
        console.error(`Failed to preload ${lang}:`, err)
      )
    )
  );

  console.log('KSA data preloaded successfully');
}
