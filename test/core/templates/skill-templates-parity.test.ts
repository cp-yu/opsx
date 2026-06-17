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
  getOpsxExploreCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getBootstrapOpsxSkillTemplate,
  getOpsxBootstrapCommandTemplate,
  getImpactSweeperSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '3f5345e6c004c333a9fd62bb85cb4df34276a55e473b73c7b1374ed8743473e2',
  getApplyChangeSkillTemplate: 'b0d17aa511eaae20291485dd694c6f686dfb060a87e4231cc150cf9cb12a35d9',
  getOpsxExploreCommandTemplate: 'c314312cdb1b3d266eb9b7445433ccd4eaf9b55163dba721fc785d931014d83d',
  getOpsxApplyCommandTemplate: '163aafb92030a51ae2af2efaa269a995f7e2859761531bf05b9bad58dfab4e8c',
  getArchiveChangeSkillTemplate: '6a5aa47359d02be48e8f579920f581468237eb4e4cf9883c277b62cf1e64e892',
  getOpsxArchiveCommandTemplate: '35b6279e0aa01b5c4f064a71c87e251691ed85257baf6bdf5b65abb484c228fa',
  getOpsxProposeSkillTemplate: 'a5f80a3236a21fcd8eca9a49d3eab0fe134c027e2b1b228d57ad5fe9d8590695',
  getOpsxProposeCommandTemplate: 'c8310e675940a0f33d7d21abfa6acfa55a32472008430d5647638729b6ef830c',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: 'e716b90f35332851874f4426319aacb9fdef04a7221bf68669a73bde2232f203',
  getOpsxBootstrapCommandTemplate: 'a249d04dd1706472b46b344b0fe3568c218e369eff33ed781007a473421206a1',
  getImpactSweeperSkillTemplate: '74872272b436a03f87bb5e3b90b357f0f2b60e9cda92f5547b3551a688ac219b',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'a5b73918e5c08b1b226bdf650a5590314272e3619662585cd38f2dc45566f99d',
  'openspec-apply-change': '45b1e9afaf7d7afa7b609dd938bba48ee34d9c04ee92ef4e5406fba728eb9b02',
  'openspec-archive-change': '1b54037bf392825b97164da31ebfcdc968d941044455cd18eb556b74032fdc02',
  'openspec-propose': 'aaef35e945d218256c12037e37326b0a2d169a75394da663781c91893f35d8ad',
  'openspec-impact-sweeper': 'c166f8b42feda796304938e089ffb7aed65658b99a61fee8ee7c9e9d84a09f3a',
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
      getOpsxExploreCommandTemplate,
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
