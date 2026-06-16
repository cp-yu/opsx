import { describe, it, expect } from 'vitest';
import {
  ALL_WORKFLOWS,
  SKILL_NAMES,
  COMMAND_IDS,
  WORKFLOW_TO_COMMAND_SLUG,
  WORKFLOW_TO_SKILL_DIR,
  isWorkflowId,
  getWorkflowSurface,
  getWorkflowSurfaces,
  getCommandSlug,
  getWorkflowPromptMeta,
  normalizeWorkflowIds,
} from '../../src/core/workflow-surface.js';
import * as workflowSurface from '../../src/core/workflow-surface.js';

describe('workflow-surface', () => {
  describe('固定的 6 个工作流', () => {
    it('ALL_WORKFLOWS 应包含固定的 6 个工作流', () => {
      expect(ALL_WORKFLOWS).toEqual([
        'propose',
        'explore',
        'apply',
        'archive',
        'bootstrap-opsx',
        'snack',
      ]);
    });

    it('SKILL_NAMES 应包含 6 个 skill 名称', () => {
      expect(SKILL_NAMES).toHaveLength(6);
      expect(SKILL_NAMES).toContain('openspec-propose');
      expect(SKILL_NAMES).toContain('openspec-explore');
      expect(SKILL_NAMES).toContain('openspec-apply-change');
      expect(SKILL_NAMES).toContain('openspec-archive-change');
      expect(SKILL_NAMES).toContain('openspec-bootstrap-opsx');
      expect(SKILL_NAMES).toContain('openspec-snack');
    });

    it('COMMAND_IDS 与 ALL_WORKFLOWS 一致', () => {
      expect(COMMAND_IDS).toEqual(ALL_WORKFLOWS);
    });
  });

  describe('profile 系统已移除', () => {
    it('不应导出 CORE_WORKFLOWS', () => {
      expect((workflowSurface as Record<string, unknown>).CORE_WORKFLOWS).toBeUndefined();
    });

    it('不应导出 EXPANDED_WORKFLOWS', () => {
      expect((workflowSurface as Record<string, unknown>).EXPANDED_WORKFLOWS).toBeUndefined();
    });
  });

  describe('WORKFLOW_TO_SKILL_DIR', () => {
    it('将每个工作流映射到 skill 目录名', () => {
      expect(WORKFLOW_TO_SKILL_DIR.propose).toBe('openspec-propose');
      expect(WORKFLOW_TO_SKILL_DIR.apply).toBe('openspec-apply-change');
      expect(WORKFLOW_TO_SKILL_DIR.archive).toBe('openspec-archive-change');
      expect(WORKFLOW_TO_SKILL_DIR['bootstrap-opsx']).toBe('openspec-bootstrap-opsx');
    });
  });

  describe('WORKFLOW_TO_COMMAND_SLUG', () => {
    it('将每个工作流映射到 command slug', () => {
      expect(WORKFLOW_TO_COMMAND_SLUG.propose).toBe('propose');
      expect(WORKFLOW_TO_COMMAND_SLUG['bootstrap-opsx']).toBe('bootstrap');
    });
  });

  describe('isWorkflowId', () => {
    it('识别有效的工作流 ID', () => {
      expect(isWorkflowId('propose')).toBe(true);
      expect(isWorkflowId('apply')).toBe(true);
    });

    it('拒绝已删除的工作流 ID', () => {
      const removed = ['new', 'continue', 'ff', 'verify', 'sync', 'bulk-archive', 'onboard'];
      for (const id of removed) {
        expect(isWorkflowId(id)).toBe(false);
      }
    });

    it('拒绝任意字符串', () => {
      expect(isWorkflowId('nonexistent')).toBe(false);
      expect(isWorkflowId('')).toBe(false);
    });
  });

  describe('getWorkflowSurface / getWorkflowSurfaces', () => {
    it('返回指定工作流的 surface 定义', () => {
      const surface = getWorkflowSurface('propose');
      expect(surface.workflowId).toBe('propose');
      expect(surface.skillDirName).toBe('openspec-propose');
    });

    it('getWorkflowSurfaces 无过滤器返回全部 6 个', () => {
      expect(getWorkflowSurfaces()).toHaveLength(6);
    });

    it('getWorkflowSurfaces 按过滤器筛选', () => {
      const filtered = getWorkflowSurfaces(['apply', 'archive']);
      expect(filtered).toHaveLength(2);
    });
  });

  describe('getCommandSlug', () => {
    it('返回工作流的 command slug', () => {
      expect(getCommandSlug('propose')).toBe('propose');
      expect(getCommandSlug('bootstrap-opsx')).toBe('bootstrap');
    });
  });

  describe('getWorkflowPromptMeta', () => {
    it('返回有效工作流的 prompt 元数据', () => {
      const meta = getWorkflowPromptMeta('propose');
      expect(meta).toBeDefined();
    });

    it('对无效 ID 返回 undefined', () => {
      expect(getWorkflowPromptMeta('nonexistent')).toBeUndefined();
    });
  });

  describe('normalizeWorkflowIds', () => {
    it('无参数返回空数组', () => {
      expect(normalizeWorkflowIds()).toEqual([]);
    });

    it('过滤无效 ID 并按 ALL_WORKFLOWS 顺序保留有效项', () => {
      const normalized = normalizeWorkflowIds(['archive', 'propose', 'invalid']);
      expect(normalized).toEqual(['propose', 'archive']);
    });
  });
});
