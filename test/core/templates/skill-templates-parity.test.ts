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
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '6ef2992890f91a8108a8874a58838370e607d1fbe4735a82ec0ce8590973c789',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: 'c372620fd6429b1fd1775c6563538f6a61a6ce3a4b2bab8adc34116c6ecb2092',
  getApplyChangeSkillTemplate: 'd8ebd1087912e8b0bc912de941c64baa81aa5d6c0c187a1d5aded7eecf5b1f39',
  getFfChangeSkillTemplate: '1680c4be7b00745bf0001f14e73e3258eb3390a1c53a3ef413de379177c201a8',
  getSyncSpecsSkillTemplate: '6d576f14d850348cb8c86d38197a85bc16bb00b940293eb1aa3c37fc5d56a3ea',
  getOnboardSkillTemplate: 'f23bc6a137a524dfa10a93d1413ebc9048aadc09265a4ceabb1381b95d07dc03',
  getOpsxExploreCommandTemplate: '96df9ce9b91fc340aa7baa2d0b9cd750f614fc85a48f3993ec5ceaabb9b6b2ad',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: '297a36c1a425378c783fa77c1aec675953dd8921195499f8ef7973822e31e485',
  getOpsxApplyCommandTemplate: '42ffa9b05a3d4bfcf3a363127053011027b297b72bf42fc0c166d145f5e57fc0',
  getOpsxFfCommandTemplate: '59e8945b73015f11d55d0284879a7e5dce7c350a9c2e20195b9242a4e977c33a',
  getArchiveChangeSkillTemplate: 'f0e497a04cd42cd4b684710856cf621d4c72e8054bff5998e8826dfc58ede20d',
  getBulkArchiveChangeSkillTemplate: '4df92fd441cf929bb07e1702cc83d3a348fc528bb23e4ddeb9983506dd616d7f',
  getOpsxSyncCommandTemplate: '1c1d7ed61be75ec11232e2b2d8954725173eadb0d65948a630f16ab0f9ddfb96',
  getVerifyChangeSkillTemplate: '02fc1c58f514508b36e54e5fa8dbfe1fc883e65554b4345bc93f5ce1b109ef1b',
  getOpsxArchiveCommandTemplate: 'f2ccefebbf66635285e63153f52d2f3ebbf26689ae800dbd6c277bcefb460ccd',
  getOpsxOnboardCommandTemplate: '27f6cbc05a4463eb7607b339c9f63ff9ae2358ed8e01c860df1ccc14e82cbbbd',
  getOpsxBulkArchiveCommandTemplate: '2ea5419ecbaaf9227d78519aa608b67dacad93fe851d257f7d2a3308ac8bb301',
  getOpsxVerifyCommandTemplate: 'b602ce2995fb316e28b232c7c880586b1ae92c2f4282854dd41ca5918895231e',
  getOpsxProposeSkillTemplate: '646dcf1788610d0d4717edd60990fa965f47b11cab19612c38378fc53aeecfb4',
  getOpsxProposeCommandTemplate: '56400a14ffd8e6cfcb2322a269406b033303e0d869da950d6b7033cc7dcf0d8a',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: '692e37c20b4723fbf2a0bfc338c041a0a014089f263237df7e00b0ca696e3460',
  getOpsxBootstrapCommandTemplate: 'd5dff20a1fc1e873db48770d0b4257adb0a692b93d94a477e0a59952473cf0e3',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '69df211e2b53804e2c064074d891203de1e12142f1db6cb15541e9a4e947c174',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '72fd684047da165711e4480c027f6a7792402ed8cd9d0747fc3a2cc307b921c9',
  'openspec-apply-change': 'e561444e73fff33d0400f9aecf1defa44a155a077b4a275762c3b8d4f3585669',
  'openspec-ff-change': '73e47e642ebfd9b70ac9e2a0e1911ecf97e250adc5c7437af7917bef4695de74',
  'openspec-sync-specs': '6cfeb1ad65f5b863dfa6a3623f01dd82c131dacf41842280abc61c80dc62a5ef',
  'openspec-archive-change': '534b733148f51ffc692989dd68070eca2b0372b6de14e5414fcfb8d28537713c',
  'openspec-bulk-archive-change': 'f0be4d9d342bf96d70ec92cdd2f8f41838eec8f6add6147b06d4cca5995d5a4c',
  'openspec-verify-change': '3188c00897e5b0be052a135375cb8fedba9e59a47793753bc0e26e002ffa2d3a',
  'openspec-onboard': 'd19c2b2940ea0574c20dee4d18156d2e7e6624b41f835e21c9b064f70247e85d',
  'openspec-propose': '74c2fd15e8e1f5f0bce08fede369298207d7d0317a1a2e024a7b14e04574fae0',
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
