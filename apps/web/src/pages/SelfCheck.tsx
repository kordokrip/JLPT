import { SelfCheckView } from '../features/self-check/SelfCheckView';
import { useSelfCheck } from '../features/self-check/useSelfCheck';

export default function SelfCheck() {
  const selfCheck = useSelfCheck();

  return (
    <SelfCheckView
      selectedWeek={selfCheck.selectedWeek}
      isLoading={selfCheck.isLoading}
      checkedLocal={selfCheck.checkedLocal}
      checkedCount={selfCheck.checkedCount}
      totalCount={selfCheck.totalCount}
      pct={selfCheck.pct}
      sections={selfCheck.sections}
      templates={selfCheck.templates}
      radarScores={selfCheck.radarScores}
      recommendations={selfCheck.recommendations}
      submit={selfCheck.submit}
      onToggle={selfCheck.toggle}
    />
  );
}
