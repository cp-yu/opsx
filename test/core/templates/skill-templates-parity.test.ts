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
  getExploreSkillTemplate: 'cdf701cea871f711f046b31e1c4d104ad15e178b0fc8788bb948001513ece7d1',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: 'c372620fd6429b1fd1775c6563538f6a61a6ce3a4b2bab8adc34116c6ecb2092',
  getApplyChangeSkillTemplate: 'd7bf52bf8e301ddc233160733abdfab91f20898d5637d5cc6dc71228c4a99400',
  getFfChangeSkillTemplate: '1680c4be7b00745bf0001f14e73e3258eb3390a1c53a3ef413de379177c201a8',
  getSyncSpecsSkillTemplate: '956ca6006dd51f42b4b617565ae90475085bcc3e638b9ed54d3ee56f8e2f4de6',
  getOnboardSkillTemplate: 'e683f5f6c41e89a2b4f10f965c4a720a25479c32a38962b09369b6a87e3b1725',
  getOpsxExploreCommandTemplate: '4e3aac52121358246e5e09171ee1cf86305df24061396a1a7ba9510b4b88e64d',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: '297a36c1a425378c783fa77c1aec675953dd8921195499f8ef7973822e31e485',
  getOpsxApplyCommandTemplate: 'e0ebbacc597bae9ca5457e984a2e99ff51ecad3614400077afd1ea5da9b30567',
  getOpsxFfCommandTemplate: '59e8945b73015f11d55d0284879a7e5dce7c350a9c2e20195b9242a4e977c33a',
  getArchiveChangeSkillTemplate: 'd1230271180680c936803deefe28f8389705058ce8ec5730a4d58c0d48985e8d',
  getBulkArchiveChangeSkillTemplate: '6344646b78bd8209aa3fb04e38fba09beb0c0d6d3376698687a3172e082fa9e5',
  getOpsxSyncCommandTemplate: '41f05a74bc121c1c42fd917deae60e678aeed538103db3aa46629a763228d2d5',
  getVerifyChangeSkillTemplate: '006bd14a6db87cf6314faef06fcda6c19852c11298de6ffe35e23f73398a1307',
  getOpsxArchiveCommandTemplate: '14cc777e691437ef695f40663f8dd22f41b9f1469914a235527c28dbb00379a0',
  getOpsxOnboardCommandTemplate: '82a587c12268f8642e16e7be603c95badbe985fb7731052184fbb7a49b38e007',
  getOpsxBulkArchiveCommandTemplate: '434c8946e269caab6cdf17b1438bf68575fbbb94b5bebef84d2300f4502dcfdf',
  getOpsxVerifyCommandTemplate: 'd320da8979fd3a31e0137ec4c35fd13477b356439bdc45b86a6ebb4e1b56afb1',
  getOpsxProposeSkillTemplate: '646dcf1788610d0d4717edd60990fa965f47b11cab19612c38378fc53aeecfb4',
  getOpsxProposeCommandTemplate: '56400a14ffd8e6cfcb2322a269406b033303e0d869da950d6b7033cc7dcf0d8a',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: '692e37c20b4723fbf2a0bfc338c041a0a014089f263237df7e00b0ca696e3460',
  getOpsxBootstrapCommandTemplate: 'd5dff20a1fc1e873db48770d0b4257adb0a692b93d94a477e0a59952473cf0e3',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '26d7ac3473610ba043549fe1206766b4f2f714466baeb764614106aca9fc846b',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '72fd684047da165711e4480c027f6a7792402ed8cd9d0747fc3a2cc307b921c9',
  'openspec-apply-change': 'a412736bacc208a4a60a0bc0ad3d69911c40267f17b09c30cb93578bccc4e6c5',
  'openspec-ff-change': '73e47e642ebfd9b70ac9e2a0e1911ecf97e250adc5c7437af7917bef4695de74',
  'openspec-sync-specs': 'd9d3df6454833c5d871e73458f3569197220a5f804c3c425e499808cce0dbcff',
  'openspec-archive-change': '23cd3d8c92d377a6cc8f4d36c0a3fa8543b2c3ecf8aee962cc447c10b9e0dce7',
  'openspec-bulk-archive-change': 'ea077798b5f1e6855c6230261282b1d34625e7895be2c84ce732baba603231e4',
  'openspec-verify-change': '8e1514ae50b81c0b83feeaa048391fda247fb181b9b6ce971a830a8a8247ff30',
  'openspec-onboard': '6620f219db62d1718daf1052b2ae79e202087f221c7ccb80888c9d5e64afca9b',
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
