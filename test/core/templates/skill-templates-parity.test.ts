import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getExploreSkillTemplate,
  getFeedbackSkillTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getBootstrapOpsxSkillTemplate,
  getOpsxBootstrapCommandTemplate,
  getImpactSweeperSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '91cc28049156724a067a5605b9fbf6f82e9723b86021381bc788ad343294fba3',
  getApplyChangeSkillTemplate: '3abb6fcdd3f89eece35183ba21dcb4e0a5c89733d9f25d73f31b359c031173da',
  getOpsxApplyCommandTemplate: '4db67e54888accd2ee09555daa8a4274bb4924eaa189cf8a10fff3dbef4fc90c',
  getArchiveChangeSkillTemplate: 'cee00d2e7712233a9a7ccdc6dc8863f297b88c47021efa7318f300cda5bfc4be',
  getOpsxArchiveCommandTemplate: 'a4318eca0c9bf7404ed2675c2ff238a4dcfb956eee1e65a0c5e962294556f2ea',
  getOpsxProposeSkillTemplate: 'e4895a01729832a4564daab9d4428677fe969943e8d9a30d5d9a055a468816da',
  getOpsxProposeCommandTemplate: '2743bb593c363678dcb320ea44d470270e2054930242d1525e23a5810ec282af',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: 'e716b90f35332851874f4426319aacb9fdef04a7221bf68669a73bde2232f203',
  getOpsxBootstrapCommandTemplate: 'a249d04dd1706472b46b344b0fe3568c218e369eff33ed781007a473421206a1',
  getImpactSweeperSkillTemplate: '2806c1ff6aae0fe5563d90b35c3cbeb69b4aa8963a1ba2670513e9c5b31062e2',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '1b89674fc0e1a1800a78a16020f19a20dfd75c69f25dfd2aff42e161151d54eb',
  'openspec-apply-change': '07ae4dd0db0af6f221d669ab303a49492253898ea8c11ff115cda825137e3742',
  'openspec-archive-change': 'afffb7a64b6c8fd2bf9986e286621c357b013006398c4ab61450b898fb54cc44',
  'openspec-propose': '718ed9cb0f0dacc39c67f7e08a0f9f944af8a117f690b22a492985788cb6bf47',
  'openspec-impact-sweeper': '67bf2a12f45ce7421a262e814487cdc38a01945a1c65f94ddd707d3eb2397253',
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('skill templates split parity', () => {
  it('preserves all template function payloads exactly', () => {
    const functionFactories: Record<string, () => unknown> = {
      getExploreSkillTemplate,
      getApplyChangeSkillTemplate,
      getOpsxApplyCommandTemplate,
      getArchiveChangeSkillTemplate,
      getOpsxArchiveCommandTemplate,
      getOpsxProposeSkillTemplate,
      getOpsxProposeCommandTemplate,
      getFeedbackSkillTemplate,
      getBootstrapOpsxSkillTemplate,
      getOpsxBootstrapCommandTemplate,
      getImpactSweeperSkillTemplate,
    };

    const actualHashes = Object.fromEntries(
      Object.entries(functionFactories).map(([name, fn]) => [name, hash(stableStringify(fn()))])
    );

    expect(actualHashes).toEqual(EXPECTED_FUNCTION_HASHES);
  });

  it('preserves generated skill file content exactly', () => {
    // Intentionally excludes getFeedbackSkillTemplate: skillFactories only models templates
    // deployed via generateSkillContent, while feedback is covered in function payload parity.
    const skillFactories: Array<[string, () => SkillTemplate]> = [
      ['openspec-explore', getExploreSkillTemplate],
      ['openspec-apply-change', getApplyChangeSkillTemplate],
      ['openspec-archive-change', getArchiveChangeSkillTemplate],
      ['openspec-propose', getOpsxProposeSkillTemplate],
      ['openspec-impact-sweeper', getImpactSweeperSkillTemplate],
    ];

    const actualHashes = Object.fromEntries(
      skillFactories.map(([dirName, createTemplate]) => [
        dirName,
        hash(generateSkillContent(createTemplate(), 'PARITY-BASELINE')),
      ])
    );

    expect(actualHashes).toEqual(EXPECTED_GENERATED_SKILL_CONTENT_HASHES);
  });

});
