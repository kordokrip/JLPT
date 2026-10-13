// 강성호 2026-10-13: 양언어 안내·보류·오프라인·학습 화면 보호를 실제 표시 컴포넌트에서 검증한다.
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PwaUpdatePrompt } from "./PwaUpdatePrompt";
import { usePwaUpdateStore as store } from "../stores/pwa-update-store";
import { useUiStore } from "../stores/ui-store";
import "../i18n";
beforeEach(() => {
  store.setState({
    available: false,
    open: false,
    applying: false,
    error: null,
    action: null,
  });
  useUiStore.setState({ isOnline: true });
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(
    function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  );
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute("open");
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function show(path = "/") {
  const action = vi.fn();
  store.getState().show(action);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <PwaUpdatePrompt />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return action;
}
it("offers Korean and Japanese confirmation and lets the user defer", () => {
  const action = show();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("새 버전 업데이트")).toBeInTheDocument();
  expect(screen.getByText("新しいバージョンに更新")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /나중에/ }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(action).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /새 버전 업데이트/ }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
it("does not show the modal on a learning route", () => {
  const action = show("/study/saved-session");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    screen.getByText("홈에서 앱을 업데이트할 수 있습니다"),
  ).toBeInTheDocument();
  expect(action).not.toHaveBeenCalled();
});
it("blocks offline updating", () => {
  useUiStore.setState({ isOnline: false });
  const action = show();
  expect(
    screen.getByRole("button", { name: /업데이트하고 새로고침/ }),
  ).toBeDisabled();
  expect(action).not.toHaveBeenCalled();
});
it("updates only after clicking confirmation", () => {
  const action = show();
  fireEvent.click(
    screen.getByRole("button", { name: /업데이트하고 새로고침/ }),
  );
  expect(action).toHaveBeenCalledTimes(1);
});
