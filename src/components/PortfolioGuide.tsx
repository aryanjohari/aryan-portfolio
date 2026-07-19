"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";

import type { SuggestedChip, SuggestedChipGroup } from "@/lib/guide-schema";

const AUTO_SUMMARY_PROMPT =
  "Give a 3-sentence recruiter summary of Aryan's strengths, availability, and live demos.";

const CHIP_GROUP_ORDER: SuggestedChipGroup[] = ["simple", "technical"];
const CHIP_GROUP_LABELS: Record<SuggestedChipGroup, string> = {
  simple: "simple",
  technical: "technical",
};

const SITE_PATH_PATTERN =
  /(\/(?:workshop|about|resume\.pdf|projects\/[a-z0-9-]+))/g;

type PortfolioGuideProps = {
  suggestedChips: SuggestedChip[];
};

type GuideState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; reply: string };

function linkifyReply(reply: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(SITE_PATH_PATTERN.source, "g");

  while ((match = pattern.exec(reply)) !== null) {
    if (match.index > lastIndex) {
      parts.push(reply.slice(lastIndex, match.index));
    }
    const href = match[1];
    parts.push(
      <Link key={`${href}-${match.index}`} href={href}>
        {href}
      </Link>,
    );
    lastIndex = match.index + href.length;
  }

  if (lastIndex < reply.length) {
    parts.push(reply.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [reply];
}

export function PortfolioGuide({ suggestedChips }: PortfolioGuideProps) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<GuideState>({ status: "idle" });
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

  return (
    <section className="portfolio-guide" aria-label="Ask Aryan">
      <form className="portfolio-guide-form" onSubmit={handleSubmit}>
        <label className="portfolio-guide-label" htmlFor="guide-message">
          Ask Aryan anything about his work, background, or availability
        </label>
        <div className="portfolio-guide-input-row">
          <input
            id="guide-message"
            className="portfolio-guide-input"
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="ask me anything"
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

      <div className="portfolio-guide-chip-rails">
        {CHIP_GROUP_ORDER.map((group) => {
          const chips = suggestedChips.filter((chip) => chip.group === group);
          if (chips.length === 0) {
            return null;
          }

          return (
            <div
              key={group}
              className="portfolio-guide-chip-group"
              role="group"
              aria-label={`${CHIP_GROUP_LABELS[group]} prompts`}
            >
              <span className="portfolio-guide-chip-group-label">
                {CHIP_GROUP_LABELS[group]}
              </span>
              <div className="portfolio-guide-chips">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className="portfolio-guide-chip"
                    onClick={() => handleChipClick(chip.prompt)}
                    disabled={state.status === "loading"}
                    title={chip.tooltip}
                    aria-label={chip.tooltip}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
          {state.status === "success" && <p>{linkifyReply(state.reply)}</p>}
        </div>
      )}
    </section>
  );
}
