import { parse } from 'yaml';

export interface SpecFrontmatter {
  capabilities: string[];
}

export function parseSpecFrontmatter(content: string): SpecFrontmatter {
  const normalized = content.replace(/\r\n?/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { capabilities: [] };
  }

  const endIndex = normalized.indexOf('\n---', 4);
  if (endIndex === -1) {
    return { capabilities: [] };
  }

  try {
    const data = parse(normalized.slice(4, endIndex)) as { capabilities?: unknown };
    const capabilities = Array.isArray(data.capabilities)
      ? data.capabilities.filter((cap: unknown): cap is string => typeof cap === 'string')
      : [];
    return { capabilities };
  } catch {
    return { capabilities: [] };
  }
}
