import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authApi: {
    config: vi.fn(),
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    setTrack: vi.fn(),
  },
  setActiveLearningTrack: vi.fn(),
  setActiveLocalUserId: vi.fn(),
}));

vi.mock("../../lib/api", () => ({ authApi: mocks.authApi }));
vi.mock("../../lib/db", () => ({
  setActiveLearningTrack: mocks.setActiveLearningTrack,
  setActiveLocalUserId: mocks.setActiveLocalUserId,
}));

import { useSettingsStore } from "../settings-store";
import { useAuthStore } from "../auth-store";

const user = {
  id: "user_login_race",
  email: "login-race@example.com",
  display_name: "Login race",
  role: "user" as const,
  learning_track: "jlpt-ja" as const,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("useAuthStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ learningTrack: "jlpt-ja" });
    useAuthStore.setState({
      status: "checking",
      user: null,
      config: null,
      error: null,
    });
  });

  it("keeps a completed password login when an earlier anonymous session probe resolves last", async () => {
    const me = deferred<{
      ok: true;
      data: { authenticated: false; user: null };
    }>();
    mocks.authApi.me.mockReturnValueOnce(me.promise);
    mocks.authApi.login.mockResolvedValueOnce({ ok: true, data: { user } });

    const refresh = useAuthStore.getState().refresh();
    await expect(
      useAuthStore.getState().login(user.email, "Passw0rd1234"),
    ).resolves.toBe(true);

    me.resolve({ ok: true, data: { authenticated: false, user: null } });
    await refresh;

    expect(useAuthStore.getState()).toMatchObject({
      status: "authenticated",
      user,
    });
    expect(mocks.setActiveLocalUserId).toHaveBeenCalledWith(user.id);
  });

  it("does not restore an authenticated session from a probe that started before logout", async () => {
    const me = deferred<{
      ok: true;
      data: { authenticated: true; user: typeof user };
    }>();
    mocks.authApi.me.mockReturnValueOnce(me.promise);
    mocks.authApi.logout.mockResolvedValueOnce({
      ok: true,
      data: { ok: true },
    });
    useAuthStore.setState({ status: "authenticated", user });

    const refresh = useAuthStore.getState().refresh();
    await useAuthStore.getState().logout();

    me.resolve({ ok: true, data: { authenticated: true, user } });
    await refresh;

    expect(useAuthStore.getState()).toMatchObject({
      status: "anonymous",
      user: null,
    });
  });

  it("applies a current anonymous probe so expired sessions still sign out", async () => {
    mocks.authApi.me.mockResolvedValueOnce({
      ok: true,
      data: { authenticated: false, user: null },
    });
    useAuthStore.setState({ status: "authenticated", user });

    await useAuthStore.getState().refresh();

    expect(useAuthStore.getState()).toMatchObject({
      status: "anonymous",
      user: null,
    });
  });
});
