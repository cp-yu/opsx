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
  getExploreSkillTemplate: 'cb2a388fc712b99f46ad72e06552636527175e65a7b59f99a883b07f9c63bbd0',
  getApplyChangeSkillTemplate: 'f92231b241a61ff8a80e5019c07e364715e55a29b8c7d5cb2c3ad7b04e80ddc5',
  getOpsxApplyCommandTemplate: 'f20ed3ff39b1e6bf9bc371b06ee7714a3bf460cb56b28e603023316bd45c8545',
  getArchiveChangeSkillTemplate: 'aa1d1386857766bec331976b3439bbba6c358344ba47f89a6f2fcea9d71862ea',
  getOpsxArchiveCommandTemplate: '837246afecdf10ebdc52f11f325f5eb598905e17e90e91883819c943c3a3cc53',
  getOpsxProposeSkillTemplate: 'e4895a01729832a4564daab9d4428677fe969943e8d9a30d5d9a055a468816da',
  getOpsxProposeCommandTemplate: '2743bb593c363678dcb320ea44d470270e2054930242d1525e23a5810ec282af',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: 'e716b90f35332851874f4426319aacb9fdef04a7221bf68669a73bde2232f203',
  getOpsxBootstrapCommandTemplate: 'a249d04dd1706472b46b344b0fe3568c218e369eff33ed781007a473421206a1',
  getImpactSweeperSkillTemplate: '2806c1ff6aae0fe5563d90b35c3cbeb69b4aa8963a1ba2670513e9c5b31062e2',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'd8eb8c6442155a7396750ddab05ca70e3838546c1e8a1b1b77626fea9ac9a19b',
  'openspec-apply-change': 'd9312b705da5020c50dd7b15da40cc69c271b33d2080216bb176e833ab8121e7',
  'openspec-archive-change': '12f4f0b6d606d7ac009d297ad52cdf4cb2d3995c36b0d726997629c2fbccf1b4',
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
