import { promises as fs } from 'fs';
import path from 'path';
import { parseSpecFrontmatter } from './parsers/spec-frontmatter.js';

export interface SpecRegistry {
  capToSpecs: Map<string, string[]>;
  specToCaps: Map<string, string[]>;
  getSpecsForCap(capId: string): string[];
  getCapsForSpec(specId: string): string[];
  getOrphanedSpecs(): string[];
  getUncoveredCaps(allCapIds: string[]): string[];
}

export async function buildSpecRegistry(projectRoot: string): Promise<SpecRegistry> {
  const specsDir = path.join(projectRoot, 'openspec', 'specs');
  const capToSpecs = new Map<string, string[]>();
  const specToCaps = new Map<string, string[]>();
  const orphanedSpecs: string[] = [];

  let entries;
  try {
    entries = await fs.readdir(specsDir, { withFileTypes: true });
  } catch {
    return createRegistry(capToSpecs, specToCaps, orphanedSpecs);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const specId = entry.name;
    const specPath = path.join(specsDir, specId, 'spec.md');
    let content: string;
    try {
      content = await fs.readFile(specPath, 'utf8');
    } catch {
      continue;
    }

    const { capabilities } = parseSpecFrontmatter(content);
    if (capabilities.length === 0) {
      orphanedSpecs.push(specId);
      continue;
    }

    specToCaps.set(specId, capabilities);
    for (const capId of capabilities) {
      const specs = capToSpecs.get(capId) ?? [];
      specs.push(specId);
      capToSpecs.set(capId, specs);
    }
  }

  sortMapValues(capToSpecs);
  orphanedSpecs.sort();

  return createRegistry(capToSpecs, specToCaps, orphanedSpecs);
}

function createRegistry(
  capToSpecs: Map<string, string[]>,
  specToCaps: Map<string, string[]>,
  orphanedSpecs: string[],
): SpecRegistry {
  return {
    capToSpecs,
    specToCaps,
    getSpecsForCap(capId: string): string[] {
      return capToSpecs.get(capId) ?? [];
    },
    getCapsForSpec(specId: string): string[] {
      return specToCaps.get(specId) ?? [];
    },
    getOrphanedSpecs(): string[] {
      return orphanedSpecs;
    },
    getUncoveredCaps(allCapIds: string[]): string[] {
      return allCapIds.filter(capId => !capToSpecs.has(capId));
    },
  };
}

function sortMapValues(map: Map<string, string[]>): void {
  for (const values of map.values()) {
    values.sort();
  }
}
