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
  getExploreSkillTemplate: '7fb76a0916d404a33dc59c17d47fb0d3f221ba22d1a9c43507ca9389d1018791',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: '3b554121e85a42b98c0f940e58d7b0bf4b99f205e76e65a92b3654000ec873b1',
  getApplyChangeSkillTemplate: 'a8544ed0393dde9965f39fc2d527349127a1900f4cd417f4813e4ba7be47c9e1',
  getFfChangeSkillTemplate: 'aa45b3f6ec87281c5b839ec4cc02e13a3f1d656b96664e7fb5d2b7ae34a0369e',
  getSyncSpecsSkillTemplate: '6d576f14d850348cb8c86d38197a85bc16bb00b940293eb1aa3c37fc5d56a3ea',
  getOnboardSkillTemplate: 'f23bc6a137a524dfa10a93d1413ebc9048aadc09265a4ceabb1381b95d07dc03',
  getOpsxExploreCommandTemplate: 'f2337be8655a37bd52548021b340ef7ecaef2fd46dbfc3b02088fceb9f93267f',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: 'c577ccc6ba5e327063f2fe5c158e4b9a9361436c305c239ecf4fefa191a12da5',
  getOpsxApplyCommandTemplate: '8af525fdcc02800c664824afaad4866915fb76f0719210c9c5e948b5c7cb42c3',
  getOpsxFfCommandTemplate: 'ad486ec20c460ad306ba2b9bc36c80c8cceee0758e4ec86095ed3b15fb91b142',
  getArchiveChangeSkillTemplate: '1e30fb8840b6fe2e565009e6d7dc16beb8a8b803971020b2de41808eed87bd43',
  getBulkArchiveChangeSkillTemplate: '4df92fd441cf929bb07e1702cc83d3a348fc528bb23e4ddeb9983506dd616d7f',
  getOpsxSyncCommandTemplate: '1c1d7ed61be75ec11232e2b2d8954725173eadb0d65948a630f16ab0f9ddfb96',
  getVerifyChangeSkillTemplate: '48339cf845a1577fad2730844fc2669d9429ea6e2bfb02bfa211124ca6932ac8',
  getOpsxArchiveCommandTemplate: '384cc12dd3cc3367a54502918e094fe7fe0a56af39ec6b07ae14f86265a1df0d',
  getOpsxOnboardCommandTemplate: '27f6cbc05a4463eb7607b339c9f63ff9ae2358ed8e01c860df1ccc14e82cbbbd',
  getOpsxBulkArchiveCommandTemplate: '2ea5419ecbaaf9227d78519aa608b67dacad93fe851d257f7d2a3308ac8bb301',
  getOpsxVerifyCommandTemplate: '05e0c78e57f78c8cd427e7cccb9c07ecad0dc060daa5ff7c3c22bf4100aa7fc8',
  getOpsxProposeSkillTemplate: '99d3d4a6845123f0150f72b4f924d5343df84ae5dfe1be9f869c8375abed4a37',
  getOpsxProposeCommandTemplate: '07381ee3ca2d373fdf2400a6e62af2d742b5924f69c3702c1afd3a412e28b7df',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: '692e37c20b4723fbf2a0bfc338c041a0a014089f263237df7e00b0ca696e3460',
  getOpsxBootstrapCommandTemplate: 'd5dff20a1fc1e873db48770d0b4257adb0a692b93d94a477e0a59952473cf0e3',
  getImpactSweeperSkillTemplate: '4e465ce3373746e2834454918028f394a28ed9f722a6e9ce82d1db376b36cbc4',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '7986edaded422d300b8761c13c4ff188e521534e253bb3b233061bc2c7123b49',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '8bb03b4f75ce914fc5e1f60917a15bdc1dc8d4d718eb419be53f6bd27de91eef',
  'openspec-apply-change': '3ea5af14e8f48f6cc3316748a2a3cb081bc4aa6e99581e39eac0604719522809',
  'openspec-ff-change': '7860311c2c5b7f628c5cb5cc3ae5408ac262bedc61785f192e406b0245f5bbff',
  'openspec-sync-specs': '6cfeb1ad65f5b863dfa6a3623f01dd82c131dacf41842280abc61c80dc62a5ef',
  'openspec-archive-change': '5a93c7426c26986f16a9515f84d837e79416914401df520e9f5f839bea052ec3',
  'openspec-bulk-archive-change': 'f0be4d9d342bf96d70ec92cdd2f8f41838eec8f6add6147b06d4cca5995d5a4c',
  'openspec-verify-change': 'ca4aa1d7d637aa65b1753b1f36950361f4998e24ce7137ef45dd992103db4198',
  'openspec-onboard': 'd19c2b2940ea0574c20dee4d18156d2e7e6624b41f835e21c9b064f70247e85d',
  'openspec-propose': '97af997f1117f982586b07acf6032c8a8b6a2fc84cc483a58d5b54a6c2003f8b',
  'openspec-impact-sweeper': '9ec1d8b3aaf4cb8c13cbe0067bd462d9ba35bb7a55377d124808179ab7193682',
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
