import { promises as fs } from 'fs';
import path from 'path';
import { readProjectOpsx } from '../utils/opsx-utils.js';
import { parseSpecFrontmatter } from './parsers/spec-frontmatter.js';

export interface BackfilledSpec {
  spec: string;
  caps: string[];
}

export interface BackfillSpecsResult {
  written: BackfilledSpec[];
  unmatched: string[];
}

export function matchSpecToCaps(specId: string, capIds: string[]): string[] {
  const specSegments = segmentSpecId(specId);
  if (specSegments.length === 0) return [];

  return capIds.filter((capId) => isSubsequence(specSegments, segmentCapId(capId)));
}

export async function writeSpecFrontmatter(specPath: string, capabilities: string[]): Promise<boolean> {
  const content = await fs.readFile(specPath, 'utf-8');
  if (hasLeadingFrontmatter(content)) {
    return false;
  }

  const frontmatter = [
    '---',
    'capabilities:',
    ...capabilities.map((capability) => `  - ${capability}`),
    '---',
    '',
  ].join('\n');

  await fs.writeFile(specPath, `${frontmatter}${content}`, 'utf-8');
  return true;
}

export async function backfillSpecs(projectRoot: string): Promise<BackfillSpecsResult> {
  const specs = await listSpecs(projectRoot);
  const bundle = await readProjectOpsx(projectRoot);
  const capIds = bundle?.capabilities.map((capability) => capability.id) ?? [];

  if (capIds.length === 0) {
    return {
      written: [],
      unmatched: specs,
    };
  }

  const written: BackfilledSpec[] = [];
  const unmatched: string[] = [];

  for (const spec of specs) {
    const specPath = path.join(projectRoot, 'openspec', 'specs', spec, 'spec.md');
    const content = await fs.readFile(specPath, 'utf-8');
    if (parseSpecFrontmatter(content).capabilities.length > 0) {
      continue;
    }

    const caps = matchSpecToCaps(spec, capIds);
    if (caps.length === 0) {
      unmatched.push(spec);
      continue;
    }

    if (await writeSpecFrontmatter(specPath, caps)) {
      written.push({ spec, caps });
    }
  }

  return { written, unmatched };
}

async function listSpecs(projectRoot: string): Promise<string[]> {
  const specsDir = path.join(projectRoot, 'openspec', 'specs');
  let entries;
  try {
    entries = await fs.readdir(specsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const specs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const specPath = path.join(specsDir, entry.name, 'spec.md');
    try {
      await fs.access(specPath);
      specs.push(entry.name);
    } catch {
      continue;
    }
  }

  return specs.sort();
}

function segmentSpecId(specId: string): string[] {
  return specId.split('-').map(normalizeSegment).filter(Boolean);
}

function segmentCapId(capId: string): string[] {
  return capId.replace(/^cap\./, '').split('.').map(normalizeSegment).filter(Boolean);
}

function normalizeSegment(segment: string): string {
  const value = segment.toLowerCase();
  if (value.endsWith('ion') && value.length > 4) {
    return `${value.slice(0, -3)}e`;
  }
  if (value.endsWith('ing') && value.length > 5) {
    return value.slice(0, -3);
  }
  if (value.endsWith('s') && value.length > 3) {
    return value.slice(0, -1);
  }
  return value;
}

function isSubsequence(needles: string[], haystack: string[]): boolean {
  let haystackIndex = 0;
  for (const needle of needles) {
    while (haystackIndex < haystack.length && haystack[haystackIndex] !== needle) {
      haystackIndex += 1;
    }
    if (haystackIndex >= haystack.length) {
      return false;
    }
    haystackIndex += 1;
  }
  return true;
}

function hasLeadingFrontmatter(content: string): boolean {
  const normalized = content.replace(/\r\n?/g, '\n');
  return normalized.startsWith('---\n') && normalized.indexOf('\n---', 4) !== -1;
}
