/**
 * N2/N1 source intake is deliberately separate from CONTENT_PATHS and the
 * production seed manifest. These records are planning templates, not source
 * registrations and not permission to collect or publish content.
 */
export interface N2N1SourceIntakeTemplate {
  level: 'N2' | 'N1';
  contentType: 'vocab' | 'grammar' | 'kanji';
  intakeState: 'source-required';
  requiredEvidence: readonly [
    'source_url',
    'retrieved_at',
    'source_sha256',
    'license_id',
    'license_url',
    'allowed_use',
    'attribution_text',
    'author',
    'first_reviewer',
    'second_reviewer',
    'reviewed_at',
    'manifest_sha256',
  ];
}

const REQUIRED_EVIDENCE = [
  'source_url',
  'retrieved_at',
  'source_sha256',
  'license_id',
  'license_url',
  'allowed_use',
  'attribution_text',
  'author',
  'first_reviewer',
  'second_reviewer',
  'reviewed_at',
  'manifest_sha256',
] as const;

export const N2_N1_SOURCE_INTAKE_TEMPLATES: readonly N2N1SourceIntakeTemplate[] = [
  { level: 'N2', contentType: 'vocab', intakeState: 'source-required', requiredEvidence: REQUIRED_EVIDENCE },
  { level: 'N2', contentType: 'grammar', intakeState: 'source-required', requiredEvidence: REQUIRED_EVIDENCE },
  { level: 'N2', contentType: 'kanji', intakeState: 'source-required', requiredEvidence: REQUIRED_EVIDENCE },
  { level: 'N1', contentType: 'vocab', intakeState: 'source-required', requiredEvidence: REQUIRED_EVIDENCE },
  { level: 'N1', contentType: 'grammar', intakeState: 'source-required', requiredEvidence: REQUIRED_EVIDENCE },
  { level: 'N1', contentType: 'kanji', intakeState: 'source-required', requiredEvidence: REQUIRED_EVIDENCE },
];
