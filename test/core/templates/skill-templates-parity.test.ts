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
  getExploreSkillTemplate: '5a6dcebf590e1ebe4cdd9c38c6754d86bd1f5b46488693c99399a7419a4b87f8',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: 'd3c49098a22aea10583127a08428b044dff566ef9cd8589bbb1f05800479a9fb',
  getApplyChangeSkillTemplate: '67d7717c0d3c5c95009dbe71beaed4ba1f28dafd0bc5f37935c8d25ad620c3e2',
  getFfChangeSkillTemplate: '9842eb81784564ec9adaf9b388ee786843a97bca2818122859fda8ac71124e69',
  getSyncSpecsSkillTemplate: '6010906ea723f73fbd92554953b556ecafbfb1d23019081f1559b587e2784ef2',
  getOnboardSkillTemplate: '819a2d117ad1386187975686839cb0584b41484013d0ca6a6691f7a439a11a4a',
  getOpsxExploreCommandTemplate: 'df72317e627ed09b97aeaa9ad26ad66ed4a9b6f87a46867d84a5a5cbcdc07ebb',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: '869ce8ffb383d2820b59311c015e8f5ca7efd47569852d2f10de693f696798df',
  getOpsxApplyCommandTemplate: 'e909cb0363b621fff55793799995a944b102e9a4f5e0354776a424bf01f73a3b',
  getOpsxFfCommandTemplate: '7a966e7fba3ce22dae7ece7bbe818bc5ad5f521e3403d00104dcf85e61202e82',
  getArchiveChangeSkillTemplate: '3be19e75b65c7f3a9805864753df2593ed89ed5a2b31a531e32b0364ec53ee91',
  getBulkArchiveChangeSkillTemplate: '6344646b78bd8209aa3fb04e38fba09beb0c0d6d3376698687a3172e082fa9e5',
  getOpsxSyncCommandTemplate: 'ee983862032b17326bb52cefb76628888fd0c880855434363dea26bbe95c3837',
  getVerifyChangeSkillTemplate: '37ba23d26dd939e85c18b73317551dc5f3d495c88364a5ad77fcb7ec044c6b08',
  getOpsxArchiveCommandTemplate: '9133793f50961724e0e21753f90eb29457d16cab5204039ee84bbc3e0b31acc5',
  getOpsxOnboardCommandTemplate: '10052d05a4e2cdade7fdfa549b3444f7a92f55a39bf81ddd6af7e0e9e83a7302',
  getOpsxBulkArchiveCommandTemplate: '434c8946e269caab6cdf17b1438bf68575fbbb94b5bebef84d2300f4502dcfdf',
  getOpsxVerifyCommandTemplate: '33edd1a195113768e4b31e26ef7636f5aa41a757828f228419401f6cd239b687',
  getOpsxProposeSkillTemplate: 'fe149c321f47249165a8f027306f24abbe333225d57e0b922ec67d4486791d8e',
  getOpsxProposeCommandTemplate: '6600eb5ce0abeb43a64de04a854a3d559a8c348a87d439cccb738c218534ed44',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: '956fbe934e1adb6088fed7a95cb69a095f5351033edf35ad466ff974550dd800',
  getOpsxBootstrapCommandTemplate: 'c6eb15e4095986118270514810220aabdcaa1557a2060d0cb00d55b31c2aca10',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'd74e646891ba00710b13a9d516eca9de90fd2b866bf0335e38db46d6c4b8b7d5',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '9cff14ec63a05ca3be7f9cd7fe5cb45d66ba0d39e256c7efb4da22633911cd7d',
  'openspec-apply-change': 'ed39ce741b4ec912e3e659fb9b71cc95732cc0ac31aa71774c8a8f885683852e',
  'openspec-ff-change': '39d6855cfa0aa54250e458016bc465d1ae30ce95a48958c4cf9f5aade8ed66d6',
  'openspec-sync-specs': '6270722c8e8a9e804dddd2a10b500e9a95e8ed345f068136d2f30dbae70655ce',
  'openspec-archive-change': '0098cb98a13a2348d2fdb91e46a6f5f03fde3806a0e1d7c5e8cc3155652fdf7a',
  'openspec-bulk-archive-change': 'ea077798b5f1e6855c6230261282b1d34625e7895be2c84ce732baba603231e4',
  'openspec-verify-change': 'a11dae36772a4187850036014d8d5dea501e641275f57ccc6d4b50b1835f01f9',
  'openspec-onboard': 'dbce376cf895f3fe4f63b4bce66d258c35b7b8884ac746670e5e35fabcefd255',
  'openspec-propose': 'bab6f408a4dc9e13da7c805b28e382074af869e40d9765d612ad322e908e6461',
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
