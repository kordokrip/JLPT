// 강성호 2026-10-13: 학습 중 강제 새로고침을 없애고 명시적인 업데이트 동의만 처리한다. IDB/학습 원장은 건드리지 않는다.
export function isPwaUpdateSafePath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/track/topik-ko" ||
    pathname === "/welcome"
  );
}
export function mayReloadPwa(pathname: string, mutations: number): boolean {
  return isPwaUpdateSafePath(pathname) && mutations === 0;
}
export async function registerPwaUpdates(
  container: ServiceWorkerContainer,
  url: string,
  type: WorkerType,
  callbacks: {
    waiting: (worker: ServiceWorker) => void;
    activated: () => void;
  },
): Promise<ServiceWorkerRegistration> {
  let previous = container.controller;
  container.addEventListener("controllerchange", () => {
    const hadController = previous !== null;
    previous = container.controller;
    if (hadController) callbacks.activated();
  });
  const registration = await container.register(url, {
    type,
    updateViaCache: "none",
  });
  const notified = new WeakSet<ServiceWorker>();
  const notify = (worker: ServiceWorker | null) => {
    if (
      !worker ||
      worker.state !== "installed" ||
      !container.controller ||
      notified.has(worker)
    )
      return;
    notified.add(worker);
    callbacks.waiting(worker);
  };
  notify(registration.waiting);
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed") notify(worker);
    });
  });
  return registration;
}
export function applyWaitingPwaUpdate(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error("update-timeout"));
    }, 10000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      if (event.data?.ok === true) resolve();
      else
        reject(
          new Error(
            event.data?.reason === "active-learning"
              ? "active-learning"
              : "update-failed",
          ),
        );
    };
    try {
      worker.postMessage({ type: "PWA_APPLY_UPDATE" }, [channel.port2]);
    } catch (error) {
      clearTimeout(timer);
      channel.port1.close();
      reject(error);
    }
  });
}
