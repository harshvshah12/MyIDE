import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { StoreEnvelopeSchema } from '../schema/entities.ts';

/**
 * Atomic Document Store with Zod Schema Validation
 *
 * Architecture & Guarantees:
 * 1. Single-Entity Atomic Replacement: Writes data to a temporary file (<name>.tmp)
 *    and executes atomic rename (fs.renameSync) to prevent half-written corruption.
 * 2. Strict Schema Enforcement: Validates all records through Zod schemas.
 * 3. Schema Versioning: Maintains an explicit schema version header (_version).
 *
 * Documented Limitations:
 * - Multi-entity transactions across separate collection files are not atomic.
 * - Concurrency across multiple OS processes is limited to file-level atomic renames.
 * - No B-Tree indexing; in-memory array filtering is used.
 * - Intended for single-node developer workstations and local team servers.
 */

const CURRENT_SCHEMA_VERSION = 1;
const DATA_DIR = path.resolve(process.cwd(), 'data', 'store');

function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Loads and validates a collection from its backing JSON store file.
 */
export function readCollection<T>(collectionName: string, itemSchema: z.ZodType<T, any, any>): T[] {
  ensureDataDirectory();
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);

  if (!fs.existsSync(filePath)) {
    // Return empty collection if file does not exist yet
    return [];
  }

  try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const rawJson = JSON.parse(rawContent);

    // Validate the envelope and item data
    const envelopeSchema = StoreEnvelopeSchema(itemSchema);
    const parsedEnvelope = envelopeSchema.safeParse(rawJson);

    if (!parsedEnvelope.success) {
      console.error(`Schema validation warning on ${collectionName}:`, parsedEnvelope.error.issues);
      // Fallback if data is raw array (backward compatibility)
      if (Array.isArray(rawJson)) {
        return rawJson.filter((item) => itemSchema.safeParse(item).success) as T[];
      }
      return [];
    }

    return parsedEnvelope.data.data as T[];
  } catch (error) {
    console.error(`Failed to read collection ${collectionName}:`, error);
    return [];
  }
}

/**
 * Atomically writes a collection to disk with schema validation.
 */
export function writeCollection<T>(collectionName: string, items: T[], itemSchema: z.ZodType<T, any, any>): void {
  ensureDataDirectory();
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  const tempPath = path.join(DATA_DIR, `${collectionName}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`);

  // Validate every item before writing
  const validatedItems: T[] = [];
  for (const item of items) {
    const parsed = itemSchema.safeParse(item);
    if (!parsed.success) {
      throw new Error(`Cannot write invalid entity to ${collectionName}: ${JSON.stringify(parsed.error.issues)}`);
    }
    validatedItems.push(parsed.data);
  }

  const envelope = {
    _version: CURRENT_SCHEMA_VERSION,
    _updatedAt: Date.now(),
    data: validatedItems,
  };

  const jsonString = JSON.stringify(envelope, null, 2);

  // 1. Write to temporary file
  fs.writeFileSync(tempPath, jsonString, 'utf8');

  // 2. Atomic rename over destination file
  try {
    fs.renameSync(tempPath, filePath);
  } catch (renameError) {
    // Windows fallback if destination is temporarily locked: retry once
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      fs.renameSync(tempPath, filePath);
    } catch (retryError) {
      // Clean up temp file if rename completely failed
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw retryError;
    }
  }
}

/**
 * Clears a collection (used primarily in test suites).
 */
export function clearCollection(collectionName: string): void {
  ensureDataDirectory();
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}