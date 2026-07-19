"use client";

import Link from "next/link";
import { FormEvent, useState, type ReactNode } from "react";

const SITE_PATH_PATTERN =
  /(\/(?:workshop|about|resume\.pdf|projects\/[a-z0-9-]+))/g;

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

export function PortfolioGuide() {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<GuideState>({ status: "idle" });

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(message);
  }

  return (
    <section className="portfolio-guide" aria-label="Ask Aryan">
      <div className="portfolio-guide-float-wrap">
        <div className="portfolio-guide-float">
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
                placeholder="ask about me…"
                maxLength={500}
                disabled={state.status === "loading"}
                autoComplete="off"
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
        </div>
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
