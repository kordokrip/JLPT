export function reloadWhenControlledServiceWorkerChanges(
  serviceWorker: ServiceWorkerContainer,
  reload: () => void = () => window.location.reload(),
): void {
  // A controller is absent on a first visit. Reloading that page during the
  // initial installation interrupts navigation and API calls. Only clients
  // already controlled by an older worker need a reload when control changes.
  const wasAlreadyControlled = serviceWorker.controller !== null;
  let reloadStarted = false;

  serviceWorker.addEventListener('controllerchange', () => {
    if (!wasAlreadyControlled || reloadStarted) return;
    reloadStarted = true;
    reload();
  });
}
