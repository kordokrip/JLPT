import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import { useDataScope } from '../../../hooks/useDataScope';

export function useTopikLearningProgress() {
  const scopeId = useDataScope();
  const rows = useLiveQuery(() => db.topik_progress.where('scope_id').equals(scopeId).toArray(), [scopeId], []);
  const completed = new Set(rows.map((row) => row.unit_id));

  const toggle = async (unitId: string) => {
    const existing = await db.topik_progress.where('[scope_id+unit_id]').equals([scopeId, unitId]).first();
    if (existing?.id) await db.topik_progress.delete(existing.id);
    else await db.topik_progress.add({ scope_id: scopeId, unit_id: unitId, completed_at: new Date().toISOString() });
  };

  return { scopeId, completed, completedCount: completed.size, toggle };
}
