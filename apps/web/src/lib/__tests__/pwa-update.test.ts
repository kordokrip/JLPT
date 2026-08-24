import { describe, expect, it, vi } from 'vitest';
import { reloadWhenControlledServiceWorkerChanges } from '../pwa-update';

function serviceWorkerContainer(controller: ServiceWorker | null) {
  const target = new EventTarget();
  return Object.assign(target, { controller }) as unknown as ServiceWorkerContainer;
}

describe('PWA service-worker replacement', () => {
  it('does not reload a first-time visitor during initial installation', () => {
    const serviceWorker = serviceWorkerContainer(null);
    const reload = vi.fn();
    reloadWhenControlledServiceWorkerChanges(serviceWorker, reload);

    serviceWorker.dispatchEvent(new Event('controllerchange'));

    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads an already-controlled PWA exactly once after replacement', () => {
    const serviceWorker = serviceWorkerContainer({} as ServiceWorker);
    const reload = vi.fn();
    reloadWhenControlledServiceWorkerChanges(serviceWorker, reload);

    serviceWorker.dispatchEvent(new Event('controllerchange'));
    serviceWorker.dispatchEvent(new Event('controllerchange'));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
