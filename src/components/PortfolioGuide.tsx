"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

const AUTO_SUMMARY_PROMPT =
  "Give a 3-sentence recruiter summary of Aryan's strengths, availability, and live demos.";
const VISIBLE_CHIP_COUNT = 4;

type PortfolioGuideProps = {
  suggestedPrompts: string[];
};

type GuideState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; reply: string };

export function PortfolioGuide({ suggestedPrompts }: PortfolioGuideProps) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<GuideState>({ status: "idle" });
  const [chipsExpanded, setChipsExpanded] = useState(false);
  const autoSubmitted = useRef(false);

  async function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || state.status === "loading") {
      return;
    }

    setState({ status: "loading" });

    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok) {
        setState({
          status: "error",
          message: data.error ?? "Could not reach the guide.",
        });
        return;
      }

      setState({
        status: "success",
        reply: data.reply ?? "No reply received.",
      });
    } catch {
      setState({
        status: "error",
        message: "Could not reach the guide.",
      });
    }
  }

  useEffect(() => {
    if (autoSubmitted.current) {
      return;
    }
    autoSubmitted.current = true;
    void submitQuestion(AUTO_SUMMARY_PROMPT);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(message);
  }

  function handleChipClick(prompt: string) {
    setMessage(prompt);
    void submitQuestion(prompt);
  }

  const visibleChips = chipsExpanded
    ? suggestedPrompts
    : suggestedPrompts.slice(0, VISIBLE_CHIP_COUNT);
  const hiddenChipCount = suggestedPrompts.length - VISIBLE_CHIP_COUNT;

  return (
    <section className="portfolio-guide" aria-label="Portfolio guide">
      <h2 className="page-heading">guide</h2>

      <div className="portfolio-guide-chips" role="group" aria-label="Suggested prompts">
        {visibleChips.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="portfolio-guide-chip"
            onClick={() => handleChipClick(prompt)}
            disabled={state.status === "loading"}
          >
            {prompt}
          </button>
        ))}
        {!chipsExpanded && hiddenChipCount > 0 && (
          <button
            type="button"
            className="portfolio-guide-chip portfolio-guide-chip--more"
            onClick={() => setChipsExpanded(true)}
            disabled={state.status === "loading"}
          >
            +{hiddenChipCount} more
          </button>
        )}
      </div>

      <form className="portfolio-guide-form" onSubmit={handleSubmit}>
        <label className="portfolio-guide-label" htmlFor="guide-message">
          Ask about projects, background, or availability
        </label>
        <div className="portfolio-guide-input-row">
          <input
            id="guide-message"
            className="portfolio-guide-input"
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="type a question…"
            maxLength={500}
            disabled={state.status === "loading"}
          />
          <button
            type="submit"
            className="portfolio-guide-submit"
            disabled={state.status === "loading" || message.trim().length === 0}
          >
            send
          </button>
        </div>
      </form>

      {(state.status === "loading" ||
        state.status === "error" ||
        state.status === "success") && (
        <div
          className={`portfolio-guide-response${
            state.status === "loading" ? " portfolio-guide-response--loading" : ""
          }`}
          aria-live="polite"
        >
          {state.status === "loading" && <p>…</p>}
          {state.status === "error" && <p>{state.message}</p>}
          {state.status === "success" && <p>{state.reply}</p>}
        </div>
      )}
    </section>
  );
}
