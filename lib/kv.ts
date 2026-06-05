import { promises as fs } from "fs";
import path from "path";

/**
 * Local filesystem store.
 *
 * Replaces the previous external storage (Supabase / Vercel Blob). Chats are
 * logged internally to disk only — no external DB or credentials required.
 * Data lives under `.chat-logs/` in the project root (gitignored).
 *
 * The `blob*` names are kept for now so callers (conversation-logger) stay
 * unchanged. This is intentionally a temporary, internal-only logging setup.
 */

const DATA_DIR = path.join(process.cwd(), ".chat-logs");

// Local logging needs no credentials, so the store is always available.
export const isBlobConfigured = true;

/** Map a logical key to a safe, cross-platform filename. Idempotent. */
function keyToFile(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");

  return path.join(DATA_DIR, `${safe}.json`);
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Store JSON data on disk */
export async function blobSet(key: string, data: unknown): Promise<void> {
  await ensureDir();
  await fs.writeFile(keyToFile(key), JSON.stringify(data), "utf8");
}

/** Read JSON data from disk */
export async function blobGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(keyToFile(key), "utf8");

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Delete a stored file */
export async function blobDel(key: string): Promise<void> {
  try {
    await fs.unlink(keyToFile(key));
  } catch {
    // Silently ignore if not found
  }
}

/** Check if a stored file exists */
export async function blobExists(key: string): Promise<boolean> {
  try {
    await fs.access(keyToFile(key));

    return true;
  } catch {
    return false;
  }
}

/** List all stored keys matching a prefix */
export async function blobList(prefix: string): Promise<string[]> {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9._-]/g, "_");

  try {
    const files = await fs.readdir(DATA_DIR);

    return files
      .filter((f) => f.endsWith(".json") && f.startsWith(safePrefix))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    // Directory may not exist yet — no entries.
    return [];
  }
}
