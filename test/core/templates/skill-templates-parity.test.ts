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
  getExploreSkillTemplate: '77fb391f1c3a4a85a3e78c5500eb8029e9ab4becbb8da898fe3de3a746572795',
  getApplyChangeSkillTemplate: 'b0318fa277f15971325e6265f9867f3dd62b8d5a7b7e242c4af8b5fc43c100d2',
  getOpsxApplyCommandTemplate: '851b1f8020776bf46f111205aec45cd176472fc2b5d5276273dd6fdbd5ed1aaa',
  getArchiveChangeSkillTemplate: '11c02091c42c889faf4c97bca9dd7f31dc8ff195adf92159606337be49bd4ecd',
  getOpsxArchiveCommandTemplate: 'a1f8a43c237f1bc70b176d1d0a95dc4d1546f624daea1c16306ad894e32b2ed8',
  getOpsxProposeSkillTemplate: 'e4895a01729832a4564daab9d4428677fe969943e8d9a30d5d9a055a468816da',
  getOpsxProposeCommandTemplate: '2743bb593c363678dcb320ea44d470270e2054930242d1525e23a5810ec282af',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: 'e716b90f35332851874f4426319aacb9fdef04a7221bf68669a73bde2232f203',
  getOpsxBootstrapCommandTemplate: 'a249d04dd1706472b46b344b0fe3568c218e369eff33ed781007a473421206a1',
  getImpactSweeperSkillTemplate: '3ff9aeb8be2c572791f0f54e0d7fa193604f0b8579423d775191cb33393dbffb',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'fd4541c58a907d0813b2151e4becb82dd3c6ede38e956ad9e0331845f1f25326',
  'openspec-apply-change': '91d51f6458838545c6651171115e4900ce95794f1be9acc754d8857f254d82d4',
  'openspec-archive-change': '53d847674d9ea4b80a8fb191071032f06d0ed3f14c66d13ee7a7b516ca0526b0',
  'openspec-propose': '718ed9cb0f0dacc39c67f7e08a0f9f944af8a117f690b22a492985788cb6bf47',
  'openspec-impact-sweeper': '4a82789ac5265770bb0fabb93b5c677cb5f2654c6499b0922ffd05c63a5d5283',
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
