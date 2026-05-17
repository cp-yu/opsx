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
  getApplyChangeSkillTemplate: '2455cf5407ecb55991dbe633210c1e1733ac7b01a43f61ef0c6c815e4cd6a83a',
  getFfChangeSkillTemplate: '1680c4be7b00745bf0001f14e73e3258eb3390a1c53a3ef413de379177c201a8',
  getSyncSpecsSkillTemplate: '6d576f14d850348cb8c86d38197a85bc16bb00b940293eb1aa3c37fc5d56a3ea',
  getOnboardSkillTemplate: 'f23bc6a137a524dfa10a93d1413ebc9048aadc09265a4ceabb1381b95d07dc03',
  getOpsxExploreCommandTemplate: '96df9ce9b91fc340aa7baa2d0b9cd750f614fc85a48f3993ec5ceaabb9b6b2ad',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: '297a36c1a425378c783fa77c1aec675953dd8921195499f8ef7973822e31e485',
  getOpsxApplyCommandTemplate: '2da668c021af9a322fb7d7b08dbb808319f4626d63704cb2e50058789b31493e',
  getOpsxFfCommandTemplate: '59e8945b73015f11d55d0284879a7e5dce7c350a9c2e20195b9242a4e977c33a',
  getArchiveChangeSkillTemplate: 'd56b5b0148e3cd2b81e80c57bc7d769da58be588d763071b825dd4732bf4638f',
  getBulkArchiveChangeSkillTemplate: '4df92fd441cf929bb07e1702cc83d3a348fc528bb23e4ddeb9983506dd616d7f',
  getOpsxSyncCommandTemplate: '1c1d7ed61be75ec11232e2b2d8954725173eadb0d65948a630f16ab0f9ddfb96',
  getVerifyChangeSkillTemplate: '0895b1e87be5998f204cc0a11c9b65a98cc50030afb36befe5197a6b90926123',
  getOpsxArchiveCommandTemplate: 'b9f6be401852d0c74c0babe18e02fde50e85ceb1c8ff7131c12337ed99198c74',
  getOpsxOnboardCommandTemplate: '27f6cbc05a4463eb7607b339c9f63ff9ae2358ed8e01c860df1ccc14e82cbbbd',
  getOpsxBulkArchiveCommandTemplate: '2ea5419ecbaaf9227d78519aa608b67dacad93fe851d257f7d2a3308ac8bb301',
  getOpsxVerifyCommandTemplate: '76c162d05b00930b6114460d1519cbd540ae24ad93abc07d4f9d718822088155',
  getOpsxProposeSkillTemplate: 'fe30dcb58f1a08b27dc5900ce7ca909a34a8fa3b6acf15f633cecdbf8e3fe528',
  getOpsxProposeCommandTemplate: '1b0f23bd47e35221a7240e578e1390bbbdf79deba6b6b86314159619c0f24e42',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: '692e37c20b4723fbf2a0bfc338c041a0a014089f263237df7e00b0ca696e3460',
  getOpsxBootstrapCommandTemplate: 'd5dff20a1fc1e873db48770d0b4257adb0a692b93d94a477e0a59952473cf0e3',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '69df211e2b53804e2c064074d891203de1e12142f1db6cb15541e9a4e947c174',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '72fd684047da165711e4480c027f6a7792402ed8cd9d0747fc3a2cc307b921c9',
  'openspec-apply-change': 'de9de1bc1486bb2752967a023ef12b4429619acc46e7c3eed604feba1f60faa7',
  'openspec-ff-change': '73e47e642ebfd9b70ac9e2a0e1911ecf97e250adc5c7437af7917bef4695de74',
  'openspec-sync-specs': '6cfeb1ad65f5b863dfa6a3623f01dd82c131dacf41842280abc61c80dc62a5ef',
  'openspec-archive-change': 'd169b2647d248fbc0afefd744861559b6855ee19ab0babd557a680d85f44125d',
  'openspec-bulk-archive-change': 'f0be4d9d342bf96d70ec92cdd2f8f41838eec8f6add6147b06d4cca5995d5a4c',
  'openspec-verify-change': 'e48a52c8dc398493e3cd7ac066614e2f4bfe1348b6a0f956b2eccfbc097670b7',
  'openspec-onboard': 'd19c2b2940ea0574c20dee4d18156d2e7e6624b41f835e21c9b064f70247e85d',
  'openspec-propose': '20ee62bad846e3134d86d1b045b16d59811c0eb438493a73ada1b4764629c4ad',
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
