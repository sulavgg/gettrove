import { supabase } from '@/integrations/supabase/client';

/**
 * Extract the storage path from a URL that might be a signed URL or a storage path.
 * If it's already a path (no http), return as-is.
 * If it's a signed URL, extract the path from it.
 */
export function extractStoragePath(urlOrPath: string): string {
  // Already a path (not a URL)
  if (!urlOrPath.startsWith('http')) {
    return urlOrPath;
  }

  try {
    const url = new URL(urlOrPath);
    // Signed URL pattern: /storage/v1/object/sign/bucket-name/path
    const signMatch = url.pathname.match(/\/storage\/v1\/object\/sign\/checkin-photos\/(.+)/);
    if (signMatch) {
      return signMatch[1];
    }
    // Public URL pattern: /storage/v1/object/public/bucket-name/path
    const publicMatch = url.pathname.match(/\/storage\/v1\/object\/public\/checkin-photos\/(.+)/);
    if (publicMatch) {
      return publicMatch[1];
    }
  } catch {
    // If URL parsing fails, return as-is
  }

  return urlOrPath;
}

/**
 * Get a fresh signed URL for a checkin photo.
 * Handles both raw storage paths and legacy signed URLs stored in DB.
 */
export async function getSignedPhotoUrl(urlOrPath: string): Promise<string> {
  const path = extractStoragePath(urlOrPath);

  const { data, error } = await supabase.storage
    .from('checkin-photos')
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL for path:', path, error);
    // Return original as fallback
    return urlOrPath;
  }

  return data.signedUrl;
}

/**
 * Get signed URLs for multiple photos in batch.
 */
export async function getSignedPhotoUrls(
  urlsOrPaths: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const pathMap = new Map<string, string>(); // path -> original

  for (const urlOrPath of urlsOrPaths) {
    const path = extractStoragePath(urlOrPath);
    pathMap.set(path, urlOrPath);
  }

  const paths = [...pathMap.keys()];

  if (paths.length === 0) return result;

  const { data, error } = await supabase.storage
    .from('checkin-photos')
    .createSignedUrls(paths, 3600);

  if (error || !data) {
    console.error('Failed to create signed URLs:', error);
    // Return originals as fallback
    for (const urlOrPath of urlsOrPaths) {
      result.set(urlOrPath, urlOrPath);
    }
    return result;
  }

  for (const item of data) {
    if (item.signedUrl && item.path) {
      const original = pathMap.get(item.path) || item.path;
      result.set(original, item.signedUrl);
    }
  }

  // Fill in any missing with originals
  for (const urlOrPath of urlsOrPaths) {
    if (!result.has(urlOrPath)) {
      result.set(urlOrPath, urlOrPath);
    }
  }

  return result;
}
