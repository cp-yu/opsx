import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

export type MergeMessageType = 'feat' | 'fix' | 'refactor' | 'perf' | 'chore';

export interface MergeMessage {
  subject: string;
  body: string;
  toString(): string;
}

interface OpsxDelta {
  ADDED?: { capabilities?: Array<{ id?: unknown }> };
  MODIFIED?: { capabilities?: Array<{ id?: unknown }> };
}

export async function generateMergeMessage(changeDir: string): Promise<MergeMessage> {
  const [proposal, design, tasks] = await Promise.all([
    readOptional(path.join(changeDir, 'proposal.md')),
    readOptional(path.join(changeDir, 'design.md')),
    readOptional(path.join(changeDir, 'tasks.md')),
  ]);

  const why = firstNonEmptyLine(section(proposal, 'Why')) || changeNameFromDir(changeDir);
  const decision = firstDecisionTitle(design);
  const type = inferMergeMessageType(section(proposal, 'What Changes'));
  const scope = await resolveMergeMessageScope(changeDir);
  const title = truncate(why, 50);
  const subject = truncate(`${type}(${scope}): ${title}`, 72);
  const changeLines = completedTaskSummaries(tasks);
  const body = [
    '## Why',
    `[业务背景] ${why}`,
    ...(decision ? [`[技术决策] ${decision}`] : []),
    '',
    '## Changes',
    ...(changeLines.length > 0 ? changeLines : ['- `archive`: 归档变更制品。']),
  ].join('\n');

  return {
    subject,
    body,
    toString() {
      return `${subject}\n\n${body}\n`;
    },
  };
}

export function inferMergeMessageType(whatChanges: string): MergeMessageType {
  if (whatChanges.includes('添加') || whatChanges.includes('新增')) {
    return 'feat';
  }
  if (whatChanges.includes('修复')) {
    return 'fix';
  }
  if (whatChanges.includes('重构') || whatChanges.includes('删除')) {
    return 'refactor';
  }
  if (whatChanges.includes('性能') || whatChanges.toLowerCase().includes('perf')) {
    return 'perf';
  }
  return 'chore';
}

export async function resolveMergeMessageScope(changeDir: string): Promise<string> {
  const delta = await readOpsxDelta(changeDir);
  const counts = new Map<string, number>();

  for (const capability of [
    ...(delta?.ADDED?.capabilities ?? []),
    ...(delta?.MODIFIED?.capabilities ?? []),
  ]) {
    const id = typeof capability.id === 'string' ? capability.id : '';
    const domain = domainFromCapabilityId(id);
    if (domain) {
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }
  }

  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  return dominant ?? changeNameFromDir(changeDir).split('-')[0] ?? 'change';
}

export async function writeManualMergeMessageDraft(changeDir: string): Promise<string> {
  const message = await generateMergeMessage(changeDir);
  const draftPath = path.join(changeDir, '.merge-message.draft');
  await fs.writeFile(draftPath, message.toString(), 'utf-8');
  return draftPath;
}

function domainFromCapabilityId(id: string): string | null {
  const parts = id.split('.');
  return parts[0] === 'cap' && parts[1] ? parts[1] : null;
}

async function readOpsxDelta(changeDir: string): Promise<OpsxDelta | null> {
  const content = await readOptional(path.join(changeDir, 'opsx-delta.yaml'));
  if (!content) {
    return null;
  }

  const parsed = parseYaml(content);
  return parsed && typeof parsed === 'object' ? parsed as OpsxDelta : null;
}

async function readOptional(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function section(markdown: string, title: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${title}`.toLowerCase());
  if (start < 0) {
    return '';
  }

  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      break;
    }
    body.push(lines[i]);
  }
  return body.join('\n').trim();
}

function firstNonEmptyLine(content: string): string {
  return content
    .split('\n')
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .find(Boolean) ?? '';
}

function firstDecisionTitle(markdown: string): string {
  const match = markdown.match(/^###\s+Decision\s+\d+:\s*(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

function completedTaskSummaries(markdown: string): string[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const summaries: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const taskMatch = lines[i].match(/^###\s+Task\s+\d+:\s*(.+)$/);
    if (!taskMatch) {
      continue;
    }

    const title = taskMatch[1].trim();
    let goal = '';
    let completed = false;
    const files: string[] = [];
    let inFiles = false;

    for (let j = i + 1; j < lines.length && !/^###\s+Task\s+\d+:/.test(lines[j]); j++) {
      const goalMatch = lines[j].match(/^\*\*Goal\*\*:\s*(.+)$/);
      if (goalMatch) {
        goal = goalMatch[1].trim();
      }
      if (/^\*\*Files\*\*:\s*$/.test(lines[j])) {
        inFiles = true;
        continue;
      }
      if (inFiles && /^\*\*[^*]+\*\*:/.test(lines[j])) {
        inFiles = false;
      }
      if (inFiles) {
        const fileMatch = lines[j].match(/^\s*-\s+[^:]+:\s+`([^`]+)`/);
        if (fileMatch?.[1]) {
          files.push(fileMatch[1]);
        }
      }
      if (/^\s*-\s+\[[xX]\]/.test(lines[j])) {
        completed = true;
      }
    }

    if (completed) {
      const reason = goal || title || '完成任务。';
      const targets = files.length > 0 ? files : ['archive'];
      for (const filePath of targets) {
        summaries.push(`- \`${filePath}\`: ${reason}`);
      }
    }
  }

  return summaries;
}

function changeNameFromDir(changeDir: string): string {
  return path.basename(changeDir).replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

function truncate(value: string, maxLength: number): string {
  return [...value].slice(0, maxLength).join('');
}
