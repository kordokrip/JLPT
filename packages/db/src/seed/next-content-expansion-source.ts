/**
 * Immutable source evidence shared by the JLPT N2/N1 practice v1 and TOPIK
 * owner Batch 6 authors. This module contains provenance only; it does not
 * register, publish, or seed content by itself.
 */
export const NEXT_CONTENT_EXPANSION_SOURCE_CODE = 'JLPT-TOPIK-NEXT-EXPANSION-20260823';
export const NEXT_CONTENT_EXPANSION_SOURCE_ASSET_ID = 'source-asset-next-content-expansion-20260823';

export const NEXT_CONTENT_EXPANSION_SOURCE_PATH =
  'packages/db/src/content/next-content-expansion-source.md';
export const NEXT_CONTENT_EXPANSION_SOURCE_URL =
  'https://github.com/kordokrip/JLPT/blob/main/packages/db/src/content/next-content-expansion-source.md';
export const NEXT_CONTENT_EXPANSION_SOURCE_SHA256 =
  'b8d1089c34ac907782bf982ba37b2a461804b014efdf6ef0f86a040e1d55209c';

export const NEXT_CONTENT_EXPANSION_INTAKE_INPUT_PATH =
  'packages/db/src/content/next-content-expansion-intake-input.json';
export const NEXT_CONTENT_EXPANSION_INTAKE_INPUT_FILE_SHA256 =
  '7e4d8c84f55df00c60f09c1679a243740b22e56181a6cf2746e035f4e7656ea6';
export const NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_PATH =
  'packages/db/src/content/next-content-expansion-intake.json';
/** Canonical artifact hash emitted by learning-source-intake/record_intake.py. */
export const NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256 =
  '85f29bd7c5a614d6dd234cba759cdf80f33e1a189f4ce6ed107aa66cac850502';
/** SHA-256 of the formatted, tracked validated intake JSON file. */
export const NEXT_CONTENT_EXPANSION_INTAKE_FILE_SHA256 =
  'ed890daa0e099642a62540cd49fe5803723b755adf066c5486158dd476786201';

export const NEXT_CONTENT_EXPANSION_LICENSE_ID = 'LicenseRef-nihongo-n3-self-authored';
export const NEXT_CONTENT_EXPANSION_LICENSE_URL =
  'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#현재-자체-저작-콘텐츠';
export const NEXT_CONTENT_EXPANSION_ATTRIBUTION =
  '© Nihongo N3 contributors; self-authored JLPT N2/N1 practice and TOPIK owner Batch 6 learning content.';
export const NEXT_CONTENT_EXPANSION_ALLOWED_USE =
  'Personal learning content; self-authored prompts, choices, scripts, answers, rubrics, and explanations; not official JLPT or TOPIK material.';
export const NEXT_CONTENT_EXPANSION_RETRIEVED_AT = '2026-08-22T16:48:32Z';
export const NEXT_CONTENT_EXPANSION_GENERATED_AT = 1787410800;

export const NEXT_CONTENT_EXPANSION_PRIMARY_SOURCE_REVIEWS = {
  edrdgGeneralDictionaryLicence: {
    url: 'https://www.edrdg.org/edrdg/licence.html',
    licenseId: 'CC-BY-SA-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sha256: '52f60ea9ca68170a2f0663d7dba381ebf1bd57c17a3347dfe21153865c156692',
    hashMethod: 'raw-response-body',
  },
  koreanBasicDictionaryApi: {
    url: 'https://krdict.korean.go.kr/kor/openApi/openApiInfo',
    sha256: 'eacbbc1c76060a85485607ef9e5e23b15df3f09da781d23ce15e4b17687e7d80',
    hashMethod: 'utf8-response-body-with-csrf-value-normalized',
  },
  koreanBasicDictionaryCopyright: {
    url: 'https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo',
    licenseId: 'CC-BY-SA-2.0-KR',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/kr/',
    sha256: 'c8fe1a9dc7662705069e2f04866d5537bf0e0a9f8b17625892739990df1bd614',
    hashMethod: 'utf8-response-body-with-csrf-value-normalized',
  },
  jlptTestSections: {
    url: 'https://www.jlpt.jp/e/guideline/testsections.html',
    termsUrl: 'https://www.jlpt.jp/e/policy.html',
    usageBoundary: 'official-exam-structure-metadata-only',
    sha256: 'b0d15f8ab1464cc1c8fec902a218c2d9390dd9895f39803915c632f85cc92ab5',
    hashMethod: 'raw-response-body',
  },
  jlptSitePolicy: {
    url: 'https://www.jlpt.jp/e/policy.html',
    rightsHolder: 'The Japan Foundation and Japan Educational Exchanges and Services',
    usageBoundary: 'no-official-test-content-reproduction',
    sha256: 'a1a6f66cf03dac44ddce0482f38c960f75e3b69e046853e8f8de3fb8ca058a70',
    hashMethod: 'raw-response-body',
  },
  topikTestStructure: {
    url: 'https://www.niied.go.kr/web/niied/contents/niied_topik',
    termsUrl: 'https://www.niied.go.kr/web/main/contents/copyright',
    usageBoundary: 'official-exam-structure-metadata-only',
    sha256: '25c3cefb1bc37fd74afad15143437c7b24545854cb99732957a1e683ebe91ae2',
    hashMethod: 'normalized-visible-body-text',
  },
  topikCopyrightPolicy: {
    url: 'https://www.niied.go.kr/web/main/contents/copyright',
    rightsHolder: 'National Institute for International Education',
    usageBoundary: 'no-official-test-content-reproduction',
    sha256: '3d84619d4c505d7d9e798d018ed12035b8b6068eb06b64cd47d8507a6717e811',
    hashMethod: 'normalized-visible-body-text',
  },
} as const;

export const NEXT_CONTENT_EXPANSION_SOURCE_EVIDENCE = {
  sourceCode: NEXT_CONTENT_EXPANSION_SOURCE_CODE,
  sourceAssetId: NEXT_CONTENT_EXPANSION_SOURCE_ASSET_ID,
  sourcePath: NEXT_CONTENT_EXPANSION_SOURCE_PATH,
  sourceUrl: NEXT_CONTENT_EXPANSION_SOURCE_URL,
  sourceSha256: NEXT_CONTENT_EXPANSION_SOURCE_SHA256,
  intakeInputPath: NEXT_CONTENT_EXPANSION_INTAKE_INPUT_PATH,
  intakeInputFileSha256: NEXT_CONTENT_EXPANSION_INTAKE_INPUT_FILE_SHA256,
  intakeArtifactPath: NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_PATH,
  intakeArtifactSha256: NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
  intakeFileSha256: NEXT_CONTENT_EXPANSION_INTAKE_FILE_SHA256,
  licenseId: NEXT_CONTENT_EXPANSION_LICENSE_ID,
  licenseUrl: NEXT_CONTENT_EXPANSION_LICENSE_URL,
  attribution: NEXT_CONTENT_EXPANSION_ATTRIBUTION,
  allowedUse: NEXT_CONTENT_EXPANSION_ALLOWED_USE,
  retrievedAt: NEXT_CONTENT_EXPANSION_RETRIEVED_AT,
  generatedAt: NEXT_CONTENT_EXPANSION_GENERATED_AT,
} as const;
