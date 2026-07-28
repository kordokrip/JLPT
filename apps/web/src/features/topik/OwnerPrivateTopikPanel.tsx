import { useState } from 'react';

import { ownerPrivateTopikApi } from '../../lib/api';
import { useDataScope } from '../../hooks/useDataScope';
import { useOwnerPrivateTopikContent } from './owner-private-content';

/**
 * Client-side admin visibility is only a convenience. The Worker independently
 * requires an admin session to claim and the claimed owner session to read.
 */
export function OwnerPrivateTopikPanel() {
  const scope = useDataScope();
  const [releaseId, setReleaseId] = useState('');
  const [manifestSha256, setManifestSha256] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const content = useOwnerPrivateTopikContent(scope, 'TOPIK-I', 'reading', true);

  const claim = async () => {
    setStatus(null);
    const result = await ownerPrivateTopikApi.claim(releaseId.trim(), manifestSha256.trim());
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setStatus('Owner-private release를 현재 관리자 세션에 연결했습니다.');
    await content.refetch();
  };

  return (
    <section className="surface-panel mt-10 max-w-[960px] border border-amber-300/70 p-5 sm:p-6" aria-labelledby="owner-private-topik-title">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Owner-private</p>
      <h2 id="owner-private-topik-title" className="mt-2 text-xl font-black">비공개 TOPIK I release</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">관리자 세션에서 한 번 claim한 release만 표시합니다. 이 응답은 오프라인·Service Worker·IndexedDB에 저장하지 않습니다.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm font-semibold">Release ID<input value={releaseId} onChange={(event) => setReleaseId(event.target.value)} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-normal" autoComplete="off" /></label>
        <label className="text-sm font-semibold">Manifest SHA-256<input value={manifestSha256} onChange={(event) => setManifestSha256(event.target.value)} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-normal" autoComplete="off" /></label>
        <button type="button" className="touch-target self-end rounded-[var(--radius-md)] bg-[var(--accent)] px-4 font-bold text-white disabled:opacity-50" disabled={!releaseId.trim() || !/^[a-f0-9]{64}$/i.test(manifestSha256.trim())} onClick={() => void claim}>Claim</button>
      </div>
      {status && <p role="status" className="mt-3 text-sm">{status}</p>}
      {content.isError && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{content.error.message}</p>}
      {content.data && <ul className="mt-5 grid gap-3">{content.data.items.map((item) => <li key={item.id} className="rounded border border-[var(--border)] p-4"><p className="text-xs font-bold text-[var(--accent)]">{item.section} · {item.skill}</p><p className="mt-2 font-semibold">{item.prompt_ko}</p></li>)}</ul>}
    </section>
  );
}
