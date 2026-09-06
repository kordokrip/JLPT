import { TopikPlacementView } from '../features/topik/placement/TopikPlacementView';
import { useTopikPlacement } from '../features/topik/placement/useTopikPlacement';

export default function TopikPlacement() {
  return <TopikPlacementView model={useTopikPlacement()} />;
}
