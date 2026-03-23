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
  getExploreSkillTemplate: 'f625df2f2a1cc21f77057035b8625ee0abefac49e2bb9dfbcf9bf8406fd48427',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: 'd3c49098a22aea10583127a08428b044dff566ef9cd8589bbb1f05800479a9fb',
  getApplyChangeSkillTemplate: '4c299ffb65696a9b43b97b05f5e299efd91b2eaca801b3409b0a01b513fd9868',
  getFfChangeSkillTemplate: '9842eb81784564ec9adaf9b388ee786843a97bca2818122859fda8ac71124e69',
  getSyncSpecsSkillTemplate: '6988699a97feb4bb1dc2f481a93994d19b4c8d1b88e0cc397dae71d14374a7a5',
  getOnboardSkillTemplate: '819a2d117ad1386187975686839cb0584b41484013d0ca6a6691f7a439a11a4a',
  getOpsxExploreCommandTemplate: '4e3aac52121358246e5e09171ee1cf86305df24061396a1a7ba9510b4b88e64d',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: '869ce8ffb383d2820b59311c015e8f5ca7efd47569852d2f10de693f696798df',
  getOpsxApplyCommandTemplate: 'b7e0cb173d2d0a43d205b3ed8f2b5f4bc8084faceab726e4080451f845e3750b',
  getOpsxFfCommandTemplate: '7a966e7fba3ce22dae7ece7bbe818bc5ad5f521e3403d00104dcf85e61202e82',
  getArchiveChangeSkillTemplate: '2c882e1e3ec5ce98916c6d55a9d4bf4fbcc675f50f8e220202b745a0f99c2afb',
  getBulkArchiveChangeSkillTemplate: '6344646b78bd8209aa3fb04e38fba09beb0c0d6d3376698687a3172e082fa9e5',
  getOpsxSyncCommandTemplate: '304a0c1362b4916a6f4483b1a365866f6bdeebf9215fa3511d9d98e74214b2cb',
  getVerifyChangeSkillTemplate: '37ba23d26dd939e85c18b73317551dc5f3d495c88364a5ad77fcb7ec044c6b08',
  getOpsxArchiveCommandTemplate: '6da35c166b5bd9fd1df66030e15fb64f760a1de04daec16d6413399463902149',
  getOpsxOnboardCommandTemplate: '10052d05a4e2cdade7fdfa549b3444f7a92f55a39bf81ddd6af7e0e9e83a7302',
  getOpsxBulkArchiveCommandTemplate: '434c8946e269caab6cdf17b1438bf68575fbbb94b5bebef84d2300f4502dcfdf',
  getOpsxVerifyCommandTemplate: '33edd1a195113768e4b31e26ef7636f5aa41a757828f228419401f6cd239b687',
  getOpsxProposeSkillTemplate: 'e2fc2d1fae36ebae07e7ba4f7185fc0ac9888953c60df95805812ef0a63ad042',
  getOpsxProposeCommandTemplate: '73978bb482ad249867963115f710d2d2986c69f956f011df3b2abed21e1fc898',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: '29e8ec2feeac8cce9c754c7bd3b5a84419e5b13af92e7f23cd3a2373a3872d5f',
  getOpsxBootstrapCommandTemplate: 'c6eb15e4095986118270514810220aabdcaa1557a2060d0cb00d55b31c2aca10',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '06a2d565d6d9467d1c50cc34aaadd8f36ba19fd9914ab783f3f0ca7e48c5e314',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '9cff14ec63a05ca3be7f9cd7fe5cb45d66ba0d39e256c7efb4da22633911cd7d',
  'openspec-apply-change': '64ba484de728bcc74eb96ebb6137eddbb5583a4b0d9f2692df04a4b8c94c64ce',
  'openspec-ff-change': '39d6855cfa0aa54250e458016bc465d1ae30ce95a48958c4cf9f5aade8ed66d6',
  'openspec-sync-specs': 'd9ca38cc057d275df4d7644f858b49f803920984dadf99796de8d213d6a09de6',
  'openspec-archive-change': 'dfae4921eaa535cf524060ead149d865a22eef29e582f4459ea3d4a989d40959',
  'openspec-bulk-archive-change': 'ea077798b5f1e6855c6230261282b1d34625e7895be2c84ce732baba603231e4',
  'openspec-verify-change': 'a11dae36772a4187850036014d8d5dea501e641275f57ccc6d4b50b1835f01f9',
  'openspec-onboard': 'dbce376cf895f3fe4f63b4bce66d258c35b7b8884ac746670e5e35fabcefd255',
  'openspec-propose': 'ec4b485dbed340a0db8d0e2be9f9a634872bc98feef2e3508e01e4b1cd514ff2',
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
