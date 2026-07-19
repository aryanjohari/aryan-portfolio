"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { prefersReducedMotion } from "@/lib/motion";

const SITE_PATH_PATTERN =
  /(\/(?:workshop|about|resume\.pdf|projects\/[a-z0-9-]+))/g;

const TYPEWRITER_CPS = 32;
const TYPEWRITER_MAX_MS = 3000;

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

function useTypewriter(fullText: string | null, enabled: boolean) {
  const [visibleLength, setVisibleLength] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!fullText) {
      setVisibleLength(0);
      setDone(false);
      return;
    }

    if (!enabled || prefersReducedMotion()) {
      setVisibleLength(fullText.length);
      setDone(true);
      return;
    }

    setVisibleLength(0);
    setDone(false);

    const total = fullText.length;
    const durationMs = Math.min(
      TYPEWRITER_MAX_MS,
      Math.max(800, (total / TYPEWRITER_CPS) * 1000),
    );
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const next = Math.floor(t * total);
      setVisibleLength(next);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setVisibleLength(total);
        setDone(true);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fullText, enabled]);

  return {
    visibleText: fullText ? fullText.slice(0, visibleLength) : "",
    done,
  };
}

export function PortfolioGuide() {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<GuideState>({ status: "idle" });
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = prefersReducedMotion();
  }, []);

  const successReply =
    state.status === "success" ? state.reply : null;
  const { visibleText, done: typingDone } = useTypewriter(
    successReply,
    state.status === "success",
  );

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

  const isLoading = state.status === "loading";

  return (
    <section className="portfolio-guide" aria-label="Ask Aryan">
      <div className="portfolio-guide-stage">
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
                  disabled={isLoading}
                  autoComplete="off"
                  aria-busy={isLoading}
                />
                <button
                  type="submit"
                  className="portfolio-guide-submit"
                  disabled={isLoading || message.trim().length === 0}
                >
                  send
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="portfolio-guide-reply-slot">
          <div
            className={`portfolio-guide-response${
              isLoading ? " portfolio-guide-response--loading" : ""
            }${
              state.status === "idle" ? " portfolio-guide-response--idle" : ""
            }`}
            aria-live="polite"
            aria-busy={isLoading || (state.status === "success" && !typingDone)}
          >
            {isLoading && (
              <p className="portfolio-guide-loading-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </p>
            )}
            {isLoading && (
              <span className="visually-hidden">Thinking</span>
            )}
            {state.status === "error" && <p>{state.message}</p>}
            {state.status === "success" && !typingDone && (
              <p aria-hidden="true">{visibleText}</p>
            )}
            {state.status === "success" && typingDone && (
              <p>{linkifyReply(state.reply)}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
