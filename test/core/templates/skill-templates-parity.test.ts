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
  getExploreSkillTemplate: '12f2946e32b5edeecc728f9981cdb3289546cf74c6462621c428cff6a89ef81b',
  getApplyChangeSkillTemplate: '12d4bfa1e8257671bd3d2fe1318f215b3b1d968b304df7cdfbcd8fd3403fb3c8',
  getOpsxApplyCommandTemplate: '4db67e54888accd2ee09555daa8a4274bb4924eaa189cf8a10fff3dbef4fc90c',
  getArchiveChangeSkillTemplate: '2d12addb4277f8c6921d6f01202c11e819f77489d193a7f0bd1fbed6e9a16d07',
  getOpsxArchiveCommandTemplate: '08404e5a87a3589d5fb147f3050782bf09297e1fd53db3f11d024f1261d13512',
  getOpsxProposeSkillTemplate: 'e4895a01729832a4564daab9d4428677fe969943e8d9a30d5d9a055a468816da',
  getOpsxProposeCommandTemplate: '2743bb593c363678dcb320ea44d470270e2054930242d1525e23a5810ec282af',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: 'e716b90f35332851874f4426319aacb9fdef04a7221bf68669a73bde2232f203',
  getOpsxBootstrapCommandTemplate: 'a249d04dd1706472b46b344b0fe3568c218e369eff33ed781007a473421206a1',
  getImpactSweeperSkillTemplate: '3ff9aeb8be2c572791f0f54e0d7fa193604f0b8579423d775191cb33393dbffb',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '8ca8198818a41d060926b16823a71ac890eedb790efc1842de032dd50d1beb81',
  'openspec-apply-change': 'c84090e13bf4fe381697d11e586c395e4ef0c69fad986f353ae4fd1ac6250cef',
  'openspec-archive-change': 'a0a758d9adc1977d83c81eb0ea71be493254dde6542b05224e037eef15a0204e',
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
