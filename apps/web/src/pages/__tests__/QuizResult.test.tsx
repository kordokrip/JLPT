import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import i18n from "../../i18n";
import { api } from "../../lib/api";
import QuizResult from "../QuizResult";

it("does not display a previous account result from navigation state when ownership lookup fails", async () => {
  await i18n.changeLanguage("ko");
  vi.spyOn(api, "get").mockResolvedValue({
    ok: false,
    status: 404,
    message: "Not found",
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/quiz/result/123",
              state: {
                result: {
                  quiz_id: 123,
                  score: 99,
                  correct: 1,
                  total: 1,
                  detail: [
                    {
                      question_id: "secret",
                      correct: "PRIVATE PRIOR RESULT",
                      submitted: "secret",
                      is_correct: false,
                    },
                  ],
                },
              },
            },
          ]}
        >
          <Routes>
            <Route path="/quiz/result/:attemptId" element={<QuizResult />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
  expect(screen.queryByText("PRIVATE PRIOR RESULT")).not.toBeInTheDocument();
  await screen.findByRole(
    "button",
    { name: i18n.t("quiz.restart") },
    { timeout: 4000 },
  );
  expect(screen.queryByText(/PRIVATE PRIOR RESULT/)).not.toBeInTheDocument();
  vi.restoreAllMocks();
});
