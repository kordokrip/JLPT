// 강성호 2026-10-11: v6 전체 검수의 불합격 합집합 두 문항만 새 v7에서 명시적으로 보완한다.
import type { DraftItem } from "../learning-path-2026-10-11/data.js";

export const V7_ITEM_REVISIONS: Record<string, Partial<DraftItem>> = {
  "lp6-topik-5-writing-b2-authored-1": {
    rubric: {
      ko: "한국어 의견문 5문장에서 종이 안내문과 앱 알림의 특징을 비교하고, 근거 있는 주민 안내 방식에 관한 의견을 제시하는지 평가합니다. 종이·앱·병행 중 어느 방식도 근거가 있으면 인정합니다. 보완 조건, 추가 조사, 특정 방법과 예시는 선택입니다.",
      ja: "韓国語の意見文5文で、紙の案内とアプリ通知の特徴を比較し、根拠のある住民案内の方法への意見を示しているか評価します。紙・アプリ・併用のいずれも根拠があれば認めます。補完条件・追加調査・特定の方法や例は任意です。",
      en: "Assess a five-sentence Korean opinion comparing paper notices with app alerts and giving a justified view on how to inform residents. Paper, app, or combined approaches are acceptable when justified. Supplementary conditions, further research, particular methods, and examples are optional.",
    },
    explanation: {
      ko: "두 방식의 특징을 비교하고 근거 있는 주민 안내 의견을 5문장으로 씁니다. 종이·앱·병행 중 어느 쪽도 근거가 있으면 인정하며, 보완 조건·추가 조사·예시 방법은 선택입니다.",
      ja: "二つの方法の特徴を比較し、根拠のある住民案内についての意見を5文で書きます。紙・アプリ・併用のいずれも根拠があれば認め、補完条件・追加調査・例の方法は任意です。",
      en: "In five sentences, compare two approaches and give a justified opinion on resident guidance. Paper, an app, or both are acceptable when justified; supplementary conditions, further research, and example methods are optional.",
    },
  },
  "lp6-topik-6-writing-b4-authored-2": {
    rubric: {
      ko: "한국어 비판적 논평 6문장에서 온라인 시간과 생산성의 차이, 퇴사자 제외로 생길 수 있는 편향, 자료에 따른 주장의 한계를 근거 있게 비판하는지 평가합니다. 추가 자료 제안, 비교 설계, 집단 형평성 논의와 예시 방법은 선택이며 특정 방법을 강제하지 않습니다.",
      ja: "韓国語の批判的論評6文で、オンライン時間と生産性の差、退職者の除外による偏りの可能性、資料に基づく主張の限界を根拠をもって批判しているか評価します。追加資料の提案・比較設計・集団の公平性の議論や例の方法は任意で、特定の方法を必須にしません。",
      en: "Assess six Korean sentences that critically and justifiably address differences in online time and productivity, possible bias from excluding leavers, and the limits of claims supported by the data. Suggestions for more data, comparison designs, group-equity discussion, and example methods are optional; no particular method is required.",
    },
    explanation: {
      ko: "온라인 시간과 생산성의 차이, 퇴사자 제외의 편향 가능성, 자료가 뒷받침하는 주장 범위를 6문장으로 비판합니다. 추가 자료·비교 설계·집단 형평성 논의와 예시 방법은 선택입니다.",
      ja: "オンライン時間と生産性の差、退職者除外の偏りの可能性、資料が支える主張の範囲を6文で批判します。追加資料・比較設計・集団の公平性の議論や例の方法は任意です。",
      en: "In six sentences, critique the difference between online time and productivity, possible bias from excluding leavers, and the scope of claims the data support. Further data, comparison designs, group-equity discussion, and example methods are optional.",
    },
  },
};

export const V7_CUE_REVISIONS: Record<string, { ko: string; ja: string; en: string }> = {};
