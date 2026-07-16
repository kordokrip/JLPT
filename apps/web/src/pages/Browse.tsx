import { BrowseView } from '../features/browse/BrowseView';
import { useBrowse } from '../features/browse/useBrowse';

export default function Browse() {
  const browse = useBrowse();

  return (
    <BrowseView
      currentType={browse.currentType}
      query={browse.query}
      level={browse.level}
      levels={browse.levels}
      items={browse.items}
      loading={browse.loading}
      onType={browse.switchType}
      onLevel={browse.setLevel}
      onQuery={browse.updateQuery}
    />
  );
}
