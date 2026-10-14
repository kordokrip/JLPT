import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../i18n";
import { useAuthStore } from "../../stores/auth-store";
import { AccountMenu } from "./AccountMenu";

const avatar = vi.hoisted(() => vi.fn());
vi.mock("../../lib/account-api", () => ({
  accountApi: { avatar, uploadAvatar: vi.fn(), deleteAvatar: vi.fn() },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  return {
    promise: new Promise<T>((done) => {
      resolve = done;
    }),
    resolve,
  };
}
const user = {
  id: "account-a",
  email: "a@example.test",
  display_name: "Account A",
  role: "user" as const,
  learning_track: "jlpt-ja" as const,
};
function mount() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <AccountMenu />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  avatar.mockReset();
  avatar.mockResolvedValue(null);
  useAuthStore.setState({ status: "authenticated", user });
  await i18n.changeLanguage("en");
});

describe("AccountMenu panel", () => {
  it("traps focus, closes on Escape, and restores focus to the profile control", async () => {
    mount();
    const trigger = screen.getByRole("button", { name: "Account" });
    fireEvent.click(trigger);
    const panel = await screen.findByRole("dialog", { name: "Account" });
    expect(panel).toBeVisible();
    expect(document.activeElement).not.toBe(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when its backdrop is pressed", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    const panel = await screen.findByRole("dialog");
    fireEvent.mouseDown(panel.parentElement!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("does not apply a late uploaded-avatar response to a different account", async () => {
    const first = deferred<Blob | null>();
    avatar.mockReturnValueOnce(first.promise).mockResolvedValueOnce(null);
    useAuthStore.setState({user:{...user,avatar_updated_at:1}});
    mount();
    expect(avatar).toHaveBeenCalledWith(user.id);
    await act(async () => {
      useAuthStore.setState({
        user: {
          ...user,
          id: "account-b",
          email: "b@example.test",
          display_name: "Account B",
        },
      });
    });
    await act(async () =>
      first.resolve(new Blob(["old"], { type: "image/jpeg" })),
    );
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    await screen.findByRole("dialog");
    expect(screen.getByText("Account B")).toBeVisible();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
