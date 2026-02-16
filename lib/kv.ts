import { put, del, list, head } from "@vercel/blob";

const token = process.env.ithbat_READ_WRITE_TOKEN;

export const isBlobConfigured = !!token;

/** Store JSON data as a blob */
export async function blobSet(key: string, data: unknown): Promise<void> {
  if (!token) return;
  const json = JSON.stringify(data);

  await put(`data/${key}.json`, json, {
    access: "public",
    addRandomSuffix: false,
    token,
  });
}

/** Read JSON data from a blob */
export async function blobGet<T>(key: string): Promise<T | null> {
  if (!token) return null;

  try {
    // Check if blob exists first
    const blobInfo = await head(`data/${key}.json`, { token });

    if (!blobInfo) return null;

    const res = await fetch(blobInfo.url, { cache: "no-store" });

    if (!res.ok) return null;

    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Delete a blob */
export async function blobDel(key: string): Promise<void> {
  if (!token) return;

  try {
    // Find the blob URL first
    const blobInfo = await head(`data/${key}.json`, { token });

    if (blobInfo) {
      await del(blobInfo.url, { token });
    }
  } catch {
    // Silently ignore if not found
  }
}

/** Check if a blob exists */
export async function blobExists(key: string): Promise<boolean> {
  if (!token) return false;

  try {
    const blobInfo = await head(`data/${key}.json`, { token });

    return !!blobInfo;
  } catch {
    return false;
  }
}

/** List all blob keys matching a prefix */
export async function blobList(prefix: string): Promise<string[]> {
  if (!token) return [];

  try {
    const keys: string[] = [];
    let cursor: string | undefined;

    do {
      const result = await list({
        prefix: `data/${prefix}`,
        token,
        cursor,
      });

      for (const blob of result.blobs) {
        // Extract key from pathname: "data/chat:my-slug.json" -> "chat:my-slug"
        const key = blob.pathname
          .replace(/^data\//, "")
          .replace(/\.json$/, "");

        keys.push(key);
      }

      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    return keys;
  } catch {
    return [];
  }
}
