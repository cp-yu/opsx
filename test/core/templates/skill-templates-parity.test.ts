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
  getApplyChangeSkillTemplate: 'ae2fb8a09a9d50a0ae260c78a035a39a0faff29664ebb04964c1f522f651689b',
  getFfChangeSkillTemplate: '05b8c2433bf7ef13195c135b99a034514a3cbe33bfb5c2a65e64c7d09754c21b',
  getSyncSpecsSkillTemplate: '92299f9d3ebb13b71aceab145359b162928c51d693de709e5fcd3016b19b5941',
  getOnboardSkillTemplate: '89eb19e0d8c39df8bb06b18738f067c9693d2558f1d3cc1b824f6c68249a0fcf',
  getOpsxExploreCommandTemplate: 'c314312cdb1b3d266eb9b7445433ccd4eaf9b55163dba721fc785d931014d83d',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: 'cbaf78a8fbbc3d08921f15f5228530b8dbf75971e3086f6e16a00b6c282b308d',
  getOpsxApplyCommandTemplate: '85ca1ab8e02df26d4af61a7eb48bb6d1442af68d7c3c38f5da0cd2fb338f0ca9',
  getOpsxFfCommandTemplate: '189033bed05f76a4d2f4e2b12bb889b1e9e71907c31d6c310d7b4c1bba88ce1d',
  getArchiveChangeSkillTemplate: 'd9a24cf2219d8ad517b020e177fd2880835fdc7cbb8f20a26e7c9bba799d242a',
  getBulkArchiveChangeSkillTemplate: '783613df9b97d70d31ad120cefcf9c6b4b58d4753848ac62cc0d03a3c7bd1bec',
  getOpsxSyncCommandTemplate: '1c1d7ed61be75ec11232e2b2d8954725173eadb0d65948a630f16ab0f9ddfb96',
  getVerifyChangeSkillTemplate: 'd6c1d729539d620fcc80454b63f89bb1d05eb7cd27d8b4eb3323d56ed0db4a95',
  getOpsxArchiveCommandTemplate: '0f50b91016f6b85dbacbd58192529fe680d9eaf9e6000bc5cefee2eb9155419e',
  getOpsxOnboardCommandTemplate: '19812775d9ed80b5deb4abf53bdb1963a544987759234442894b9b0b741935ef',
  getOpsxBulkArchiveCommandTemplate: '2ea5419ecbaaf9227d78519aa608b67dacad93fe851d257f7d2a3308ac8bb301',
  getOpsxVerifyCommandTemplate: 'a9fcb6a359d51586d2a12eba121367586f83e81dd6c1e4517e1549803ab28828',
  getOpsxProposeSkillTemplate: '62d9fe918933fb91e42614394610076e09877a4bedc4d78c1bc599400d004e8a',
  getOpsxProposeCommandTemplate: '623701536f0206d41a3c0e1f01f6e24a3d1ac3a3c32b47468b643288c4c059fe',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: 'e716b90f35332851874f4426319aacb9fdef04a7221bf68669a73bde2232f203',
  getOpsxBootstrapCommandTemplate: 'a249d04dd1706472b46b344b0fe3568c218e369eff33ed781007a473421206a1',
  getImpactSweeperSkillTemplate: '1959d1fd0b29f67335722c0eec5427b3dd1c059fd677b8901640d68e7ad29aff',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '108a72ebdf0b4e297bf6c04a82e160b387e06b6c358dd551ffe7d7acaa757571',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': 'e07de6f8ac6a152a5c694f07c08115fdd27dd270036697dfc4a593cb077d9c5b',
  'openspec-apply-change': 'fda60870dff17f94037a5e0da3a1cd6d0df490e07fb7bca61946c59ec742ec1e',
  'openspec-ff-change': 'dd29b0c080595652091eb75e2d24e39c10c651e55051fbdbf3df409356829d75',
  'openspec-sync-specs': '7fa1a22390e5f8eb980fe9caeb00b5d5ce74aeec32ee130561446109bb38e43a',
  'openspec-archive-change': '60b418fc6c3ddff2b847410d877e55802b220bb19174f3eceb01cd7a3b764ca2',
  'openspec-bulk-archive-change': '1f8049cf4d017eb1dc8d01f0191b68de58ff4adc169890b3b549578ccecf9871',
  'openspec-verify-change': 'b9a4d5c79c01a8c91e859d596291ad0fa500f0811111e4bd4be2605a23cb722d',
  'openspec-onboard': '04c0f441f476bcefc801ca7efec1d30c55ca1df87b42262aa3d017ed93b9f36a',
  'openspec-propose': '2d058574071a96438a8bfdf89c039d0845ed3a199877355228fd3bfeaf58042b',
  'openspec-impact-sweeper': 'deb73fe3628223ecb38afbdb3084bece801870164ce4d1e9beb29266c7d2f7d2',
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
});
