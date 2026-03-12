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
  getExploreSkillTemplate: '16308f121641d1849ea2f8593fa8b7a22401d6ec35a264c75be1d6cc5cc6bb97',
  getNewChangeSkillTemplate: '5989672758eccf54e3bb554ab97f2c129a192b12bbb7688cc1ffcf6bccb1ae9d',
  getContinueChangeSkillTemplate: 'f2e413f0333dfd6641cc2bd1a189273fdea5c399eecdde98ef528b5216f097b3',
  getApplyChangeSkillTemplate: '41274f76beb43e845831fa6d43714d8c8e7783ef2835e8ba675a2c17da5e8bbe',
  getFfChangeSkillTemplate: 'eaee7a28bfa9fc4baefcfd27ed3027829fbab906734a4a01b1bc98f88b953582',
  getSyncSpecsSkillTemplate: 'bded184e4c345619148de2c0ad80a5b527d4ffe45c87cc785889b9329e0f465b',
  getOnboardSkillTemplate: '819a2d117ad1386187975686839cb0584b41484013d0ca6a6691f7a439a11a4a',
  getOpsxExploreCommandTemplate: '04f0d7a0235f45b888e060e4f97d9a3a55afcb90735b826b658490ca0d70362f',
  getOpsxNewCommandTemplate: '62eee32d6d81a376e7be845d0891e28e6262ad07482f9bfe6af12a9f0366c364',
  getOpsxContinueCommandTemplate: '8bbaedcc95287f9e822572608137df4f49ad54cedfb08d3342d0d1c4e9716caa',
  getOpsxApplyCommandTemplate: 'a9d631a07fcd832b67d263ff3800b98604ab8d378baf1b0d545907ef3affa3b5',
  getOpsxFfCommandTemplate: 'f18a794a70bed4f54811ec80e104b929df02534494ea638fac1f631880e4b4ae',
  getArchiveChangeSkillTemplate: '847f23f63c4958ce1e19cdcd242273687a43a964f3513ce6c237c53f47e26edc',
  getBulkArchiveChangeSkillTemplate: '1b20349662b20e5fb6dd4d471ad787d15e7d779d662779e170d640ac87c780d0',
  getOpsxSyncCommandTemplate: '378d035fe7cc30be3e027b66dcc4b8afc78ef1c8369c39479c9b05a582fb5ccf',
  getVerifyChangeSkillTemplate: '26d346102c1a7b9c559cb2b07b0fa618911f7971e6ba899114ea693178e95766',
  getOpsxArchiveCommandTemplate: '51f76e748600de5f62b7d68a4cda533cc8ca33c6bee05190eae8ed1dacdcb1cc',
  getOpsxOnboardCommandTemplate: '10052d05a4e2cdade7fdfa549b3444f7a92f55a39bf81ddd6af7e0e9e83a7302',
  getOpsxBulkArchiveCommandTemplate: 'f0195edd461ff1c59b023642dab2f66dff1374758715135212c794dd22285da5',
  getOpsxVerifyCommandTemplate: '7114d6e70532c781b1a5023ea032180ab0360c6ae2e0eb2463b42045744b2147',
  getOpsxProposeSkillTemplate: '746501f841e6e691ef9280542adeb7da965d9b88f1f7dd99ef8caed8823cf228',
  getOpsxProposeCommandTemplate: '11516b1040177b33a342d9d845bf7b970f7e3f4f39dc4d2de69e0e6a9a745604',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getBootstrapOpsxSkillTemplate: '9c16277f4e153bdc54e75256e6dd7bac09b81c8b1a376cd04a5ce273b5534bb3',
  getOpsxBootstrapCommandTemplate: '57c10084058a3fa4927ea63a7da4d375f9d32e70246da0cc632d338d4a0cde90',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '3a11c94f08ae2b87f08d2229d3a24976ec88a73007681858ed03b51563bed78b',
  'openspec-new-change': 'c324a7ace1f244aa3f534ac8e3370a2c11190d6d1b85a315f26a211398310f0f',
  'openspec-continue-change': '463cf0b980ec9c3c24774414ef2a3e48e9faa8577bc8748990f45ab3d5efe960',
  'openspec-apply-change': '31124ed38a317429851b3a669887d32c4a4261fa899ea16d9526362973ec153a',
  'openspec-ff-change': '0fa12153939975413d6ca1d8cba961f105e58bab1634163dae4ebcb426abd29f',
  'openspec-sync-specs': 'b8859cf454379a19ca35dbf59eedca67306607f44a355327f9dc851114e50bde',
  'openspec-archive-change': 'ea2f3df97c2404e1a5756b457c061431f099a68f250be9c544d7b4d1fc1341ab',
  'openspec-bulk-archive-change': '3e766eb17eff1c25306f15f14350e46c58dfbfea2143d150177600854e782771',
  'openspec-verify-change': '8f4401da40c14e3a44d23097247e94b03421c81c890cbbc0d76f12d3af176009',
  'openspec-onboard': 'dbce376cf895f3fe4f63b4bce66d258c35b7b8884ac746670e5e35fabcefd255',
  'openspec-propose': '53f7b4fa043d76de5d19cc180721ae36e30d0d856200390d462b6e99b03342b3',
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
