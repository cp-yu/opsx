import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getFeedbackSkillTemplate,
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxExploreCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxOnboardCommandTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
  getBootstrapOpsxSkillTemplate,
  getOpsxBootstrapCommandTemplate,
  getImpactSweeperSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: 'ff05a05ed74f328abdac6978ffde41b7a2e470dd7798d37777898593718df64a',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: '587da99321f9730fa54c8718b96ee4112078847473dbbfb9fedd7fcf416d1182',
  getApplyChangeSkillTemplate: 'b0d17aa511eaae20291485dd694c6f686dfb060a87e4231cc150cf9cb12a35d9',
  getFfChangeSkillTemplate: '5bbe7281c29e0a2fb18f2a5f23cdca6df5bedcf300a90dbb20cff43d2c985896',
  getSyncSpecsSkillTemplate: 'd9ee4f9a035cb39fad9c51c2cfd2146c5806a3dc317a98fe9d3b2d40bdbaa6fd',
  getOnboardSkillTemplate: '89eb19e0d8c39df8bb06b18738f067c9693d2558f1d3cc1b824f6c68249a0fcf',
  getOpsxExploreCommandTemplate: 'c314312cdb1b3d266eb9b7445433ccd4eaf9b55163dba721fc785d931014d83d',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: 'cbaf78a8fbbc3d08921f15f5228530b8dbf75971e3086f6e16a00b6c282b308d',
  getOpsxApplyCommandTemplate: '163aafb92030a51ae2af2efaa269a995f7e2859761531bf05b9bad58dfab4e8c',
  getOpsxFfCommandTemplate: 'd42d14020b1c5a73e5031fd3e0e945668408077d78510fa6c827a3b4722f8281',
  getArchiveChangeSkillTemplate: '941cc65044d5b2e1070def182f19890119b2d73ad3b6479da63afc5491de7cf1',
  getBulkArchiveChangeSkillTemplate: '783613df9b97d70d31ad120cefcf9c6b4b58d4753848ac62cc0d03a3c7bd1bec',
  getOpsxSyncCommandTemplate: '1c1d7ed61be75ec11232e2b2d8954725173eadb0d65948a630f16ab0f9ddfb96',
  getVerifyChangeSkillTemplate: 'd60023fd858de1b48a2acec02fcdd4906a5dc80b8d45bb8ab3cf68fbfc73ac75',
  getOpsxArchiveCommandTemplate: '33ac6ade7e6686c5d576231c512e6364809fc4410ea87903f32f8135c0cd6b51',
  getOpsxOnboardCommandTemplate: '19812775d9ed80b5deb4abf53bdb1963a544987759234442894b9b0b741935ef',
  getOpsxBulkArchiveCommandTemplate: '2ea5419ecbaaf9227d78519aa608b67dacad93fe851d257f7d2a3308ac8bb301',
  getOpsxVerifyCommandTemplate: 'a9fcb6a359d51586d2a12eba121367586f83e81dd6c1e4517e1549803ab28828',
  getOpsxProposeSkillTemplate: 'a5f80a3236a21fcd8eca9a49d3eab0fe134c027e2b1b228d57ad5fe9d8590695',
  getOpsxProposeCommandTemplate: 'ad9b75d19eb38afd3f7896f2c1da4a1b59028f30a8814bf876b2c7bfb51ccf8d',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: 'e716b90f35332851874f4426319aacb9fdef04a7221bf68669a73bde2232f203',
  getOpsxBootstrapCommandTemplate: 'a249d04dd1706472b46b344b0fe3568c218e369eff33ed781007a473421206a1',
  getImpactSweeperSkillTemplate: '74872272b436a03f87bb5e3b90b357f0f2b60e9cda92f5547b3551a688ac219b',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '108a72ebdf0b4e297bf6c04a82e160b387e06b6c358dd551ffe7d7acaa757571',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': 'e07de6f8ac6a152a5c694f07c08115fdd27dd270036697dfc4a593cb077d9c5b',
  'openspec-apply-change': '45b1e9afaf7d7afa7b609dd938bba48ee34d9c04ee92ef4e5406fba728eb9b02',
  'openspec-ff-change': '8475505e8d78acdbe00215f0fc7ef143c86e0e3110433da41642f348916904d6',
  'openspec-sync-specs': '253b065c8c48ca102b51fa85c8f504629a9d17a0f10fe989faba56accf4ab64f',
  'openspec-archive-change': 'f1d5dd12b37a6fba95cbec766fdf9f65598808aeffc0086293043f6c6969a156',
  'openspec-bulk-archive-change': '1f8049cf4d017eb1dc8d01f0191b68de58ff4adc169890b3b549578ccecf9871',
  'openspec-verify-change': 'e2d99c88629d46419e205443ed7e13e35be58140c866b3c5b09f8fcf0caee2d3',
  'openspec-onboard': '04c0f441f476bcefc801ca7efec1d30c55ca1df87b42262aa3d017ed93b9f36a',
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
      getNewChangeSkillTemplate,
      getContinueChangeSkillTemplate,
      getApplyChangeSkillTemplate,
      getFfChangeSkillTemplate,
      getSyncSpecsSkillTemplate,
      getOnboardSkillTemplate,
      getOpsxExploreCommandTemplate,
      getOpsxNewCommandTemplate,
      getOpsxContinueCommandTemplate,
      getOpsxApplyCommandTemplate,
      getOpsxFfCommandTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getOpsxSyncCommandTemplate,
      getVerifyChangeSkillTemplate,
      getOpsxArchiveCommandTemplate,
      getOpsxOnboardCommandTemplate,
      getOpsxBulkArchiveCommandTemplate,
      getOpsxVerifyCommandTemplate,
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
      ['openspec-new-change', getNewChangeSkillTemplate],
      ['openspec-continue-change', getContinueChangeSkillTemplate],
      ['openspec-apply-change', getApplyChangeSkillTemplate],
      ['openspec-ff-change', getFfChangeSkillTemplate],
      ['openspec-sync-specs', getSyncSpecsSkillTemplate],
      ['openspec-archive-change', getArchiveChangeSkillTemplate],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['openspec-verify-change', getVerifyChangeSkillTemplate],
      ['openspec-onboard', getOnboardSkillTemplate],
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

  it('references verify checkpoint protocol from the shared references home', () => {
    const template = getVerifyChangeSkillTemplate();

    expect(template.referenceFiles?.map((file) => file.path)).toContain(
      'references/phase2-checkpoint-protocol.md'
    );
    expect(template.instructions).toContain(
      'openspec/references/openspec-phase2-checkpoint-protocol.md'
    );
    expect(template.instructions).not.toContain('references/phase2-checkpoint-protocol.md');
  });
});
