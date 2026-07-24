"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  BOOT_DONE_EVENT,
  isBootDone,
  MOTION,
  prefersReducedMotion,
} from "@/lib/motion";

const SITE_PATH_PATTERN =
  /(\/(?:workshop|about|resume\.pdf|projects\/[a-z0-9-]+))/g;

const TYPEWRITER_CPS = 32;
const TYPEWRITER_MAX_MS = 3000;

/** Soft whisper under the ask bar — DOM only, not on the WebGL canvas. */
const ASK_INVITE = "ask me anything about my work";
/** Type-once pace; short line finishes near MOTION.slow. */
const INVITE_CPS = 28;

type GuideState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; reply: string };

export type PortfolioGuideVariant = "home" | "mini";

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
  const [progress, setProgress] = useState<{
    id: string | null;
    length: number;
  }>({ id: null, length: 0 });

  useEffect(() => {
    if (!fullText || !enabled || prefersReducedMotion()) {
      return;
    }

    let cancelled = false;
    let frame = 0;
    const id = fullText;
    const total = fullText.length;
    const durationMs = Math.min(
      TYPEWRITER_MAX_MS,
      Math.max(800, (total / TYPEWRITER_CPS) * 1000),
    );
    const start = performance.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / durationMs);
      setProgress({ id, length: Math.floor(t * total) });
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setProgress({ id, length: total });
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [fullText, enabled]);

  if (!fullText) {
    return { visibleText: "", done: false };
  }

  if (!enabled || prefersReducedMotion()) {
    return { visibleText: fullText, done: true };
  }

  const length = progress.id === fullText ? progress.length : 0;
  return {
    visibleText: fullText.slice(0, length),
    done: progress.id === fullText && length >= fullText.length,
  };
}

/**
 * Soft invite under the ask bar. Reserves one line so the bar does not jump.
 * Types once after boot; reduced-motion shows the full line instantly.
 */
function AskInvite() {
  const inviteRef = useRef<HTMLParagraphElement>(null);
  const [bootDone, setBootDone] = useState(false);
  const [visible, setVisible] = useState("");

  useEffect(() => {
    if (isBootDone()) {
      setBootDone(true);
      return;
    }
    const onDone = () => setBootDone(true);
    window.addEventListener(BOOT_DONE_EVENT, onDone);
    return () => window.removeEventListener(BOOT_DONE_EVENT, onDone);
  }, []);

  useEffect(() => {
    if (!bootDone) return;
    const el = inviteRef.current;

    if (prefersReducedMotion()) {
      setVisible(ASK_INVITE);
      if (el) el.style.opacity = "1";
      return;
    }

    let cancelled = false;
    let frame = 0;
    let fadeTween: { kill: () => void } | undefined;

    void import("gsap").then(({ gsap }) => {
      if (cancelled || !inviteRef.current) return;
      fadeTween = gsap.fromTo(
        inviteRef.current,
        { opacity: 0 },
        { opacity: 1, duration: MOTION.medium, ease: MOTION.ease },
      );
    });

    const total = ASK_INVITE.length;
    const durationMs = Math.max(
      MOTION.slow * 1000,
      (total / INVITE_CPS) * 1000,
    );
    const start = performance.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / durationMs);
      setVisible(ASK_INVITE.slice(0, Math.floor(t * total)));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setVisible(ASK_INVITE);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      fadeTween?.kill();
    };
  }, [bootDone]);

  return (
    <p
      ref={inviteRef}
      className="portfolio-guide-invite"
      aria-hidden={visible.length === 0}
    >
      {visible.length > 0 ? visible : "\u00a0"}
    </p>
  );
}

type PortfolioGuideProps = {
  /** Home center ask vs compact site-bar ask. */
  variant?: PortfolioGuideVariant;
  /** Change to remount cleanly (e.g. site route changes). */
  remountKey?: string;
};

function PortfolioGuideInner({
  variant,
}: {
  variant: PortfolioGuideVariant;
}) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<GuideState>({ status: "idle" });
  const [panelOpen, setPanelOpen] = useState(false);
  const reduceMotion = useRef(false);
  const inputId =
    variant === "mini" ? "guide-message-mini" : "guide-message";

  useEffect(() => {
    reduceMotion.current = prefersReducedMotion();
  }, []);

  const successReply = state.status === "success" ? state.reply : null;
  const { visibleText, done: typingDone } = useTypewriter(
    successReply,
    state.status === "success",
  );

  const showReply =
    state.status === "loading" ||
    state.status === "error" ||
    state.status === "success";

  async function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || state.status === "loading") {
      return;
    }

    setState({ status: "loading" });
    if (variant === "mini") setPanelOpen(true);

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
  const isMini = variant === "mini";

  const replyBody = (
    <div
      className={`portfolio-guide-response${
        isLoading ? " portfolio-guide-response--loading" : ""
      }${state.status === "idle" ? " portfolio-guide-response--idle" : ""}`}
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
      {isLoading && <span className="visually-hidden">Thinking</span>}
      {state.status === "error" && <p>{state.message}</p>}
      {state.status === "success" && !typingDone && (
        <p aria-hidden="true">{visibleText}</p>
      )}
      {state.status === "success" && typingDone && (
        <p>{linkifyReply(state.reply)}</p>
      )}
    </div>
  );

  return (
    <section
      className={`portfolio-guide portfolio-guide--${variant}`}
      aria-label="Ask Aryan"
    >
      <div className="portfolio-guide-stage">
        <div className="portfolio-guide-float-wrap">
          <div className="portfolio-guide-float">
            <form className="portfolio-guide-form" onSubmit={handleSubmit}>
              <label className="portfolio-guide-label" htmlFor={inputId}>
                Ask about my work, availability, or projects
              </label>
              <div className="portfolio-guide-input-row">
                <input
                  id={inputId}
                  className="portfolio-guide-input"
                  type="text"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={
                    isMini
                      ? "ask…"
                      : "ask about my work, availability, or projects…"
                  }
                  maxLength={500}
                  disabled={isLoading}
                  autoComplete="off"
                  aria-busy={isLoading}
                  aria-controls={isMini ? "guide-mini-panel" : undefined}
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

        {!isMini && <AskInvite />}

        {!isMini && (
          <div className="portfolio-guide-reply-slot">{replyBody}</div>
        )}

        {isMini && panelOpen && showReply && (
          <div
            id="guide-mini-panel"
            className="portfolio-guide-mini-panel"
            role="region"
            aria-label="Guide reply"
          >
            <button
              type="button"
              className="portfolio-guide-mini-panel-close"
              onClick={() => {
                setPanelOpen(false);
                setState({ status: "idle" });
                setMessage("");
              }}
            >
              close
            </button>
            <div className="portfolio-guide-mini-panel-body">{replyBody}</div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Gemini ask bar — home center wireframe or compact site-chrome mini ask.
 * `remountKey` remounts cleanly on site navigations.
 */
export function PortfolioGuide({
  variant = "home",
  remountKey = "default",
}: PortfolioGuideProps) {
  return <PortfolioGuideInner key={remountKey} variant={variant} />;
}
