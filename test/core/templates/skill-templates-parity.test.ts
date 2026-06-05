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
  getExploreSkillTemplate: '30144a3a55a58719171370a01c0d8f448bea7cf0c436fe6d3c22fe50c059a111',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: '3b554121e85a42b98c0f940e58d7b0bf4b99f205e76e65a92b3654000ec873b1',
  getApplyChangeSkillTemplate: '44a1d5d5fc7b49a3db3198b6ba7d9a7bdeffd4eea0bd7294f7c85eee509b820c',
  getFfChangeSkillTemplate: '23b70f57a20ec80596e1cd8251ad1b5cb79d8322d4cc4924a85bcf89aa7bafad',
  getSyncSpecsSkillTemplate: '92299f9d3ebb13b71aceab145359b162928c51d693de709e5fcd3016b19b5941',
  getOnboardSkillTemplate: '89eb19e0d8c39df8bb06b18738f067c9693d2558f1d3cc1b824f6c68249a0fcf',
  getOpsxExploreCommandTemplate: '44dcad3f78475d8107038348f5ef53e9acba8ec63a3f381819421d39f47dfa90',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: 'c577ccc6ba5e327063f2fe5c158e4b9a9361436c305c239ecf4fefa191a12da5',
  getOpsxApplyCommandTemplate: '0700e6b0fd128486a1d9f476aa62d727ec1069037d768e8a5f0d8a758785bcf0',
  getOpsxFfCommandTemplate: 'fd3c29cf1a4993e965a2a598c91f49151151b0831cd8cc7e797381f85a7342eb',
  getArchiveChangeSkillTemplate: '25d19f7349670f3193d4054271d506f79c656f9879d8bb59fd2651f53f129178',
  getBulkArchiveChangeSkillTemplate: '783613df9b97d70d31ad120cefcf9c6b4b58d4753848ac62cc0d03a3c7bd1bec',
  getOpsxSyncCommandTemplate: '1c1d7ed61be75ec11232e2b2d8954725173eadb0d65948a630f16ab0f9ddfb96',
  getVerifyChangeSkillTemplate: '71fc2ff643c6da216d738f932505b2a280eacaa4bc3faa859c953a1800098664',
  getOpsxArchiveCommandTemplate: 'bb88881000d37335ee6d53aa2c711eec3a9accd36d35f186ca7f380c2eb2bf56',
  getOpsxOnboardCommandTemplate: '19812775d9ed80b5deb4abf53bdb1963a544987759234442894b9b0b741935ef',
  getOpsxBulkArchiveCommandTemplate: '2ea5419ecbaaf9227d78519aa608b67dacad93fe851d257f7d2a3308ac8bb301',
  getOpsxVerifyCommandTemplate: '7b78ffdb525ae7ceea309006f37d28383c79580a81eca4ed91ca00e1afea4db3',
  getOpsxProposeSkillTemplate: 'c549a655941f676db4fc2c9fdb6bb9034b73e462ca43defb8cc49756cd17c9b1',
  getOpsxProposeCommandTemplate: 'f6d92cd8a78230e114dd437becb380e0e7663c97ae971bfb573968f022ee1abd',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: 'e716b90f35332851874f4426319aacb9fdef04a7221bf68669a73bde2232f203',
  getOpsxBootstrapCommandTemplate: 'a249d04dd1706472b46b344b0fe3568c218e369eff33ed781007a473421206a1',
  getImpactSweeperSkillTemplate: '1959d1fd0b29f67335722c0eec5427b3dd1c059fd677b8901640d68e7ad29aff',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '5b18eb8dbd425007cd0d92f3875cd6872443e582ad19d78c40fc2993ef258cc3',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '8bb03b4f75ce914fc5e1f60917a15bdc1dc8d4d718eb419be53f6bd27de91eef',
  'openspec-apply-change': '10a21d2952223dfae4f609eeec968804e6e2f1ee926da39c50fbbfeaa804ca38',
  'openspec-ff-change': 'b0205fe5064bb877aadf9d5b40f1f405dc862766ffd6c76c90a726abb168e180',
  'openspec-sync-specs': '7fa1a22390e5f8eb980fe9caeb00b5d5ce74aeec32ee130561446109bb38e43a',
  'openspec-archive-change': '7a3862cedc79ed96bae8282c91b1fe43c23a90209a2e1e8107826b1aae074a53',
  'openspec-bulk-archive-change': '1f8049cf4d017eb1dc8d01f0191b68de58ff4adc169890b3b549578ccecf9871',
  'openspec-verify-change': '9d6c2f8b01e4b0c618ec4e8961b70030a23e0a2e4f18b055fbf38dc755488d81',
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
