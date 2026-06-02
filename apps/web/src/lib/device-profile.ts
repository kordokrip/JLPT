import { isBrowser } from './browser';

type DeviceClass = 'compact' | 'phone' | 'tablet' | 'desktop';

function getDeviceClass(width: number): DeviceClass {
  if (width < 360) return 'compact';
  if (width < 768) return 'phone';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function applyDeviceProfile() {
  if (!isBrowser()) return;

  const root = document.documentElement;
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const pointer = window.matchMedia('(pointer: coarse)').matches ? 'coarse' : 'fine';
  const orientation = width > height ? 'landscape' : 'portrait';

  root.style.setProperty('--vvh', `${height}px`);
  root.style.setProperty('--device-width', `${width}px`);
  root.dataset.deviceClass = getDeviceClass(width);
  root.dataset.orientation = orientation;
  root.dataset.pointer = pointer;
}

export function initDeviceProfile() {
  if (!isBrowser()) return;

  applyDeviceProfile();
  window.addEventListener('resize', applyDeviceProfile, { passive: true });
  window.visualViewport?.addEventListener('resize', applyDeviceProfile);
  window.visualViewport?.addEventListener('scroll', applyDeviceProfile);
}
