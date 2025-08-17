// loader.mjs
import { resolve as resolveTs } from 'ts-node/esm';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

// Cache for resolved paths to improve performance
const resolutionCache = new Map();

// Base path pointing to your source folder
const basePath = path.join(process.cwd(), 'src');
const baseUrl = pathToFileURL(basePath).href + (basePath.endsWith(path.sep) ? '' : '/');

// Define alias map here — you can expand this later
const aliasMap = {
  '@': baseUrl,
  '#': baseUrl
};

// Sort aliases by length to avoid partial prefix collisions
const orderedAliases = Object.entries(aliasMap).sort(([a], [b]) => b.length - a.length);

// ESM loader resolve hook
export async function resolve(specifier, context, defaultResolve) {
  // Return cached resolution if available
  if (resolutionCache.has(specifier)) {
    return resolutionCache.get(specifier);
  }

  try {
    let resolved;

    // Attempt to match alias
    const matchedAlias = orderedAliases.find(([alias]) => specifier.startsWith(alias));
    if (matchedAlias) {
      const [alias, base] = matchedAlias;
      const rawPath = specifier.slice(alias.length);
      const joinedPath = path.join(basePath, rawPath);

      try {
        const stats = await fs.stat(joinedPath);
        if (stats.isDirectory()) {
          // Handle directory as index.js (e.g., @/utils => @/utils/index.js)
          resolved = await resolveTs(`${base}${rawPath}/index.js`, context, defaultResolve);
        }
      } catch {
        // Not a directory or doesn't exist, continue
      }

      // Fallback to .js file
      resolved = resolved || await resolveTs(`${base}${rawPath}.js`, context, defaultResolve);
    } else {
      // Fall back to regular resolution
      resolved = await resolveTs(specifier, context, defaultResolve);
    }

    // Cache and return
    resolutionCache.set(specifier, resolved);
    return resolved;

  } catch (error) {
    console.error(`[Loader] Failed to resolve ${specifier}:`, error);
    throw error;
  }
}
