import { StatsView } from '../features/stats/StatsView';
import { useStats } from '../features/stats/useStats';

export default function Stats() {
  const { data, isError } = useStats();
  return <StatsView data={data} isError={isError} />;
}
