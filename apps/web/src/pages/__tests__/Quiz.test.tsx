import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import i18n from "../../i18n";
import Quiz from "../Quiz";
vi.mock('../../hooks/useLearningProfile', () => ({ useLearningProfile: () => ({ data: { target_level: 'N5' } }) }));

vi.mock("../../hooks/useTrackStatus", () => ({
  useTrackStatus: () => ({ levels: ["N5", "N4", "N3"] }),
}));

function renderQuiz(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[path]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/:mode" element={<Quiz />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe("Quiz page baseline", () => {
  it("keeps the mode selection screen stable before feature extraction", () => {
    const { asFragment } = renderQuiz("/quiz");

    expect(asFragment()).toMatchSnapshot();
  });

  it("keeps the mode configuration screen stable before feature extraction", () => {
    const { asFragment } = renderQuiz("/quiz/vocab_mc");

    expect(asFragment()).toMatchSnapshot();
  });

  it("keeps the invalid mode message stable before feature extraction", () => {
    const { asFragment } = renderQuiz("/quiz/unsupported");

    expect(asFragment()).toMatchSnapshot();
  });
});
