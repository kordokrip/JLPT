export interface SelfCheckRow {
  week_no: number;
  vocab_score: number | null;
  grammar_score: number | null;
  reading_score: number | null;
  listening_score: number | null;
  speaking_score: number | null;
  writing_score: number | null;
  domain_score: number | null;
  notes: string | null;
  updated_at: string | null;
}

export interface SelfCheckPayload {
  week_no: number;
  vocab_score: number;
  grammar_score: number;
  reading_score: number;
  listening_score: number;
  speaking_score: number;
  writing_score: number;
  domain_score: number;
  notes?: string;
}

export type SelfCheckCategory = 'vocab' | 'grammar' | 'reading' | 'listening' | 'speaking' | 'writing' | 'strategy';

export interface SelfCheckTemplate {
  code: string;
  level: string;
  category: SelfCheckCategory;
  sort_order: number;
  item_ko: string;
  evidence_ko: string | null;
  recommendation_ko: string;
  source_name: string;
  source_url: string;
}

export interface TemplateResponse {
  level: string;
  templates: SelfCheckTemplate[];
}

export type SelfCheckSection = {
  category: SelfCheckCategory;
  title: string;
  items: SelfCheckTemplate[];
};
