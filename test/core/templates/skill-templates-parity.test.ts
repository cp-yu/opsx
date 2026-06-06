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
  getExploreSkillTemplate: '63eeaffecbba5fd8bd6522bc52ca2db89e7ebb273300c7ff1eafe7e3901385a9',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: '3b554121e85a42b98c0f940e58d7b0bf4b99f205e76e65a92b3654000ec873b1',
  getApplyChangeSkillTemplate: '0c9fe9650e7bc6ca121cc78af57928d6dbe68089fa8d5ca9339244fe8cd575b2',
  getFfChangeSkillTemplate: '23b70f57a20ec80596e1cd8251ad1b5cb79d8322d4cc4924a85bcf89aa7bafad',
  getSyncSpecsSkillTemplate: '92299f9d3ebb13b71aceab145359b162928c51d693de709e5fcd3016b19b5941',
  getOnboardSkillTemplate: '89eb19e0d8c39df8bb06b18738f067c9693d2558f1d3cc1b824f6c68249a0fcf',
  getOpsxExploreCommandTemplate: 'b423d737f475c0d95c48e494278e7055ebaa24c5ba78ff84fdcbf94a816c0f97',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: 'c577ccc6ba5e327063f2fe5c158e4b9a9361436c305c239ecf4fefa191a12da5',
  getOpsxApplyCommandTemplate: '0700e6b0fd128486a1d9f476aa62d727ec1069037d768e8a5f0d8a758785bcf0',
  getOpsxFfCommandTemplate: 'fd3c29cf1a4993e965a2a598c91f49151151b0831cd8cc7e797381f85a7342eb',
  getArchiveChangeSkillTemplate: '25d19f7349670f3193d4054271d506f79c656f9879d8bb59fd2651f53f129178',
  getBulkArchiveChangeSkillTemplate: '783613df9b97d70d31ad120cefcf9c6b4b58d4753848ac62cc0d03a3c7bd1bec',
  getOpsxSyncCommandTemplate: '1c1d7ed61be75ec11232e2b2d8954725173eadb0d65948a630f16ab0f9ddfb96',
  getVerifyChangeSkillTemplate: 'd6c1d729539d620fcc80454b63f89bb1d05eb7cd27d8b4eb3323d56ed0db4a95',
  getOpsxArchiveCommandTemplate: 'bb88881000d37335ee6d53aa2c711eec3a9accd36d35f186ca7f380c2eb2bf56',
  getOpsxOnboardCommandTemplate: '19812775d9ed80b5deb4abf53bdb1963a544987759234442894b9b0b741935ef',
  getOpsxBulkArchiveCommandTemplate: '2ea5419ecbaaf9227d78519aa608b67dacad93fe851d257f7d2a3308ac8bb301',
  getOpsxVerifyCommandTemplate: 'a9fcb6a359d51586d2a12eba121367586f83e81dd6c1e4517e1549803ab28828',
  getOpsxProposeSkillTemplate: 'c549a655941f676db4fc2c9fdb6bb9034b73e462ca43defb8cc49756cd17c9b1',
  getOpsxProposeCommandTemplate: 'f6d92cd8a78230e114dd437becb380e0e7663c97ae971bfb573968f022ee1abd',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: 'e716b90f35332851874f4426319aacb9fdef04a7221bf68669a73bde2232f203',
  getOpsxBootstrapCommandTemplate: 'a249d04dd1706472b46b344b0fe3568c218e369eff33ed781007a473421206a1',
  getImpactSweeperSkillTemplate: '1959d1fd0b29f67335722c0eec5427b3dd1c059fd677b8901640d68e7ad29aff',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '7010602630a788edebd384fe35e30ff8e22823880ab966b7aadba841c65c504d',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '8bb03b4f75ce914fc5e1f60917a15bdc1dc8d4d718eb419be53f6bd27de91eef',
  'openspec-apply-change': '1bc71542eef820035632a7385e71939d94b0d599f8285ae67333403d41616caa',
  'openspec-ff-change': 'b0205fe5064bb877aadf9d5b40f1f405dc862766ffd6c76c90a726abb168e180',
  'openspec-sync-specs': '7fa1a22390e5f8eb980fe9caeb00b5d5ce74aeec32ee130561446109bb38e43a',
  'openspec-archive-change': '7a3862cedc79ed96bae8282c91b1fe43c23a90209a2e1e8107826b1aae074a53',
  'openspec-bulk-archive-change': '1f8049cf4d017eb1dc8d01f0191b68de58ff4adc169890b3b549578ccecf9871',
  'openspec-verify-change': 'b9a4d5c79c01a8c91e859d596291ad0fa500f0811111e4bd4be2605a23cb722d',
  'openspec-onboard': '04c0f441f476bcefc801ca7efec1d30c55ca1df87b42262aa3d017ed93b9f36a',
  'openspec-propose': '5f579df4fc1f69725d404e2ca2b608876557009cace5d5a020d146916f4e7c75',
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
