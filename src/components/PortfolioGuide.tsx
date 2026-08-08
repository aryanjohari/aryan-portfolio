"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FormEvent,
  startTransition,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import {
  isResumePath,
  validateNavigateTo,
} from "@/lib/guide-navigate";
import {
  BOOT_DONE_EVENT,
  isBootDone,
  MOTION,
  prefersReducedMotion,
} from "@/lib/motion";

const SITE_PATH_PATTERN =
  /(\/(?:projects(?:\/[a-z0-9-]+)?|about|workshop|resume\.pdf))/g;

const TYPEWRITER_CPS = 32;
const TYPEWRITER_MAX_MS = 3000;
const HISTORY_PAIRS = 3;
const MAX_SESSION_ASKS = 10;
const STORAGE_KEY = "portfolio-guide:v1";
const SESSION_CAP_MESSAGE =
  "That’s enough for this visit — close the tab or clear history to ask again later.";

const EXPLAIN_PAGE_PROMPT = "Explain this page";
const GO_NEXT_PROMPT = "Where should I go next from here?";

/** Soft whisper under the ask bar — DOM only, not on the WebGL canvas. */
const ASK_INVITE = "ask about this page or my work";
/** Type-once pace; short line finishes near MOTION.slow. */
const INVITE_CPS = 28;

type TranscriptTurn = {
  id: string;
  role: "user" | "model";
  text: string;
};

type GuideUiStatus = "idle" | "loading" | "error";

type StoredGuideSession = {
  turns: TranscriptTurn[];
  visitMemory: string;
  updatedAt: number;
};

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

function loadSession(): StoredGuideSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredGuideSession;
    if (!parsed || !Array.isArray(parsed.turns)) return null;
    return {
      turns: parsed.turns.filter(
        (turn) =>
          turn &&
          typeof turn.id === "string" &&
          (turn.role === "user" || turn.role === "model") &&
          typeof turn.text === "string",
      ),
      visitMemory:
        typeof parsed.visitMemory === "string" ? parsed.visitMemory : "",
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function saveSession(session: StoredGuideSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // quota / private mode — ignore
  }
}

function clearSessionStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function countUserAsks(turns: TranscriptTurn[]): number {
  return turns.filter((turn) => turn.role === "user").length;
}

function historyPayload(turns: TranscriptTurn[]): Array<{
  role: "user" | "model";
  text: string;
}> {
  const pairsBudget = HISTORY_PAIRS * 2;
  return turns.slice(-pairsBudget).map((turn) => ({
    role: turn.role,
    text: turn.text,
  }));
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

type GuideHintsProps = {
  variant: PortfolioGuideVariant;
  disabled: boolean;
  onAsk: () => void;
  onExplain: () => void;
  onGo: () => void;
};

/** Three whisper actions — not a chip toolbar. */
function GuideHints({
  variant,
  disabled,
  onAsk,
  onExplain,
  onGo,
}: GuideHintsProps) {
  const isMini = variant === "mini";

  return (
    <div
      className={`portfolio-guide-hints${
        isMini ? " portfolio-guide-hints--mini" : ""
      }`}
      role="group"
      aria-label="Guide hints"
    >
      <button
        type="button"
        className="portfolio-guide-hint"
        disabled={disabled}
        onClick={onAsk}
        aria-label="Ask — focus the question input"
      >
        ask
      </button>
      <span className="portfolio-guide-hint-sep" aria-hidden="true">
        ·
      </span>
      <button
        type="button"
        className="portfolio-guide-hint"
        disabled={disabled}
        onClick={onExplain}
        aria-label="Explain this page"
      >
        explain page
      </button>
      <span className="portfolio-guide-hint-sep" aria-hidden="true">
        ·
      </span>
      <button
        type="button"
        className="portfolio-guide-hint"
        disabled={disabled}
        onClick={onGo}
        aria-label="Ask where to go next"
      >
        go to…
      </button>
    </div>
  );
}

type NavigateConfirmProps = {
  path: string;
  onGo: () => void;
  onStay: () => void;
  goRef: RefObject<HTMLButtonElement | null>;
};

function NavigateConfirm({
  path,
  onGo,
  onStay,
  goRef,
}: NavigateConfirmProps) {
  return (
    <div
      className="portfolio-guide-nav-confirm"
      role="group"
      aria-label={`Confirm navigation to ${path}`}
    >
      <span className="portfolio-guide-nav-confirm-label">
        go to {path}?
      </span>
      <button
        ref={goRef}
        type="button"
        className="portfolio-guide-nav-confirm-go"
        onClick={onGo}
      >
        Go
      </button>
      <button
        type="button"
        className="portfolio-guide-nav-confirm-stay"
        onClick={onStay}
      >
        Stay
      </button>
    </div>
  );
}

type LiveReplyProps = {
  isLoading: boolean;
  status: GuideUiStatus;
  errorMessage: string | null;
  latestModel: TranscriptTurn | null;
  visibleText: string;
  typing: boolean;
  liveRef: RefObject<HTMLDivElement | null>;
};

function LiveReply({
  isLoading,
  status,
  errorMessage,
  latestModel,
  visibleText,
  typing,
  liveRef,
}: LiveReplyProps) {
  const idle = !isLoading && status !== "error" && !latestModel;

  return (
    <div
      ref={liveRef}
      className={`portfolio-guide-live${
        isLoading ? " portfolio-guide-live--loading" : ""
      }${idle ? " portfolio-guide-live--idle" : ""}`}
      aria-live="polite"
      aria-busy={isLoading || typing}
    >
      {isLoading && (
        <>
          <p className="portfolio-guide-loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </p>
          <span className="visually-hidden">Thinking</span>
        </>
      )}

      {!isLoading && status === "error" && errorMessage && (
        <p className="portfolio-guide-error">{errorMessage}</p>
      )}

      {!isLoading && status !== "error" && latestModel && (
        <p className="portfolio-guide-live-text">
          {typing ? visibleText : linkifyReply(latestModel.text)}
        </p>
      )}
    </div>
  );
}

type ChatHistoryProps = {
  turns: TranscriptTurn[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onClear: () => void;
  panelId: string;
  titleId: string;
  listRef: RefObject<HTMLOListElement | null>;
  glyphRef: RefObject<HTMLButtonElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
};

/** Quiet glyph + separate void overlay for the full session transcript. */
function ChatHistory({
  turns,
  open,
  onToggle,
  onClose,
  onClear,
  panelId,
  titleId,
  listRef,
  glyphRef,
  closeRef,
}: ChatHistoryProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (turns.length === 0) return null;

  return (
    <>
      <button
        ref={glyphRef}
        type="button"
        className="portfolio-guide-history-glyph"
        aria-label="Chat history"
        title="Chat history"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <svg
          className="portfolio-guide-history-glyph-icon"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M3 4.5h10M3 8h10M3 11.5h6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="portfolio-guide-history-layer">
          <button
            type="button"
            className="portfolio-guide-history-backdrop"
            aria-label="Close chat history"
            tabIndex={-1}
            onClick={onClose}
          />
          <div
            id={panelId}
            className="portfolio-guide-history-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="portfolio-guide-history-toolbar">
              <h2 id={titleId} className="portfolio-guide-history-title">
                Chat history
              </h2>
              <div className="portfolio-guide-history-actions">
                <button
                  type="button"
                  className="portfolio-guide-clear"
                  onClick={onClear}
                >
                  clear history
                </button>
                <button
                  ref={closeRef}
                  type="button"
                  className="portfolio-guide-history-close"
                  onClick={onClose}
                >
                  close
                </button>
              </div>
            </div>
            <ol ref={listRef} className="portfolio-guide-transcript">
              {turns.map((turn) => (
                <li
                  key={turn.id}
                  className={`portfolio-guide-turn portfolio-guide-turn--${turn.role}`}
                >
                  <span className="portfolio-guide-turn-label">
                    {turn.role === "user" ? "you" : "guide"}
                  </span>
                  <p>
                    {turn.role === "model"
                      ? linkifyReply(turn.text)
                      : turn.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
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
  const pathname = usePathname() || "/";
  const router = useRouter();
  const historyPanelId = useId();
  const historyTitleId = useId();
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [visitMemory, setVisitMemory] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<GuideUiStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [typingTurnId, setTypingTurnId] = useState<string | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const historyListRef = useRef<HTMLOListElement>(null);
  const historyGlyphRef = useRef<HTMLButtonElement>(null);
  const historyCloseRef = useRef<HTMLButtonElement>(null);
  const navGoRef = useRef<HTMLButtonElement>(null);
  const inputId =
    variant === "mini" ? "guide-message-mini" : "guide-message";

  useEffect(() => {
    const stored = loadSession();
    // sessionStorage hydrate — client-only; must not run in useState init (SSR mismatch)
    startTransition(() => {
      if (stored) {
        setTurns(stored.turns);
        setVisitMemory(stored.visitMemory);
        if (stored.turns.length > 0 && variant === "mini") {
          setPanelOpen(true);
        }
      }
      setHydrated(true);
    });
  }, [variant]);

  useEffect(() => {
    if (!hydrated) return;
    saveSession({
      turns,
      visitMemory,
      updatedAt: Date.now(),
    });
  }, [turns, visitMemory, hydrated]);

  const latestModel =
    [...turns].reverse().find((turn) => turn.role === "model") ?? null;
  const typewriterActive =
    typingTurnId !== null && latestModel?.id === typingTurnId;
  const { visibleText, done: typingDone } = useTypewriter(
    typewriterActive ? latestModel?.text ?? null : null,
    typewriterActive,
  );
  /* Keep live reply top stable; scroll only inside the pane (user-driven). */
  useEffect(() => {
    const el = liveRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [latestModel?.id, status]);

  useEffect(() => {
    if (!historyOpen) return;
    const el = historyListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    historyCloseRef.current?.focus();
  }, [historyOpen, turns.length]);

  useEffect(() => {
    if (!pendingNavigate) return;
    queueMicrotask(() => navGoRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPendingNavigate(null);
        queueMicrotask(() => {
          document.getElementById(inputId)?.focus();
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingNavigate, inputId]);

  function focusAskInput() {
    queueMicrotask(() => {
      document.getElementById(inputId)?.focus();
    });
  }

  function clearHistory() {
    setTurns([]);
    setVisitMemory("");
    setErrorMessage(null);
    setStatus("idle");
    setTypingTurnId(null);
    setPendingNavigate(null);
    setHistoryOpen(false);
    clearSessionStorage();
    focusAskInput();
  }

  function closeHistory() {
    setHistoryOpen(false);
    queueMicrotask(() => historyGlyphRef.current?.focus());
  }

  function toggleHistory() {
    setHistoryOpen((prev) => !prev);
  }

  function dismissNavigateConfirm() {
    setPendingNavigate(null);
    focusAskInput();
  }

  function confirmNavigate() {
    const path = pendingNavigate
      ? validateNavigateTo(pendingNavigate)
      : undefined;
    setPendingNavigate(null);
    if (!path) {
      focusAskInput();
      return;
    }
    if (isResumePath(path)) {
      window.location.assign(path);
      return;
    }
    router.push(path);
  }

  async function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || status === "loading") {
      return;
    }

    if (countUserAsks(turns) >= MAX_SESSION_ASKS) {
      setStatus("error");
      setErrorMessage(SESSION_CAP_MESSAGE);
      if (variant === "mini") setPanelOpen(true);
      return;
    }

    const userTurn: TranscriptTurn = {
      id: makeId(),
      role: "user",
      text: trimmed,
    };
    const history = historyPayload(turns);

    setTurns((prev) => [...prev, userTurn]);
    setMessage("");
    setStatus("loading");
    setErrorMessage(null);
    setHistoryOpen(false);
    setTypingTurnId(null);
    setPendingNavigate(null);
    if (variant === "mini") setPanelOpen(true);

    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          pathname,
          history,
          ...(visitMemory ? { visitMemory } : {}),
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        visitMemory?: string;
        navigateTo?: string;
        error?: string;
      };

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Could not reach the guide.");
        return;
      }

      const reply = data.reply ?? "No reply received.";
      const modelTurn: TranscriptTurn = {
        id: makeId(),
        role: "model",
        text: reply,
      };
      setTurns((prev) => [...prev, modelTurn]);
      if (typeof data.visitMemory === "string") {
        setVisitMemory(data.visitMemory.slice(0, 1000));
      }
      const destination = validateNavigateTo(data.navigateTo);
      setPendingNavigate(destination ?? null);
      setTypingTurnId(modelTurn.id);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach the guide.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(message);
  }

  const isLoading = status === "loading";
  const isMini = variant === "mini";
  const atSessionCap = countUserAsks(turns) >= MAX_SESSION_ASKS;
  const hintsDisabled = isLoading || atSessionCap;
  const showLiveSurface =
    Boolean(latestModel) ||
    isLoading ||
    status === "error" ||
    Boolean(pendingNavigate);
  const typing =
    Boolean(typingTurnId) && !typingDone && latestModel?.id === typingTurnId;
  const showConfirm =
    Boolean(pendingNavigate) && !isLoading && status !== "error";

  const liveBlock = (
    <LiveReply
      isLoading={isLoading}
      status={status}
      errorMessage={errorMessage}
      latestModel={latestModel}
      visibleText={visibleText}
      typing={typing}
      liveRef={liveRef}
    />
  );

  const confirmBlock =
    showConfirm && pendingNavigate ? (
      <NavigateConfirm
        path={pendingNavigate}
        onGo={confirmNavigate}
        onStay={dismissNavigateConfirm}
        goRef={navGoRef}
      />
    ) : null;

  const historyBlock = (
    <ChatHistory
      turns={turns}
      open={historyOpen}
      onToggle={toggleHistory}
      onClose={closeHistory}
      onClear={clearHistory}
      panelId={historyPanelId}
      titleId={historyTitleId}
      listRef={historyListRef}
      glyphRef={historyGlyphRef}
      closeRef={historyCloseRef}
    />
  );

  const hintsBlock = (
    <GuideHints
      variant={variant}
      disabled={hintsDisabled}
      onAsk={focusAskInput}
      onExplain={() => {
        void submitQuestion(EXPLAIN_PAGE_PROMPT);
      }}
      onGo={() => {
        void submitQuestion(GO_NEXT_PROMPT);
      }}
    />
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
                Ask about this page, my work, availability, or projects
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
                      ? "ask about this page…"
                      : "ask about this page or my work…"
                  }
                  maxLength={500}
                  disabled={isLoading || atSessionCap}
                  autoComplete="off"
                  aria-busy={isLoading}
                  aria-controls={isMini ? "guide-mini-panel" : undefined}
                />
                <button
                  type="submit"
                  className="portfolio-guide-submit"
                  disabled={
                    isLoading ||
                    atSessionCap ||
                    message.trim().length === 0
                  }
                >
                  send
                </button>
              </div>
            </form>
          </div>
          {historyBlock}
        </div>

        {hintsBlock}

        {!isMini && <AskInvite />}

        {!isMini && (
          <div className="portfolio-guide-reply-slot">
            {liveBlock}
            {confirmBlock}
          </div>
        )}

        {isMini && panelOpen && showLiveSurface && (
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
                setHistoryOpen(false);
                setPendingNavigate(null);
                setErrorMessage(null);
                setStatus("idle");
                setMessage("");
              }}
            >
              close
            </button>
            <div className="portfolio-guide-mini-panel-body">
              {liveBlock}
              {confirmBlock}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Gemini ask bar — home center wireframe or compact site-chrome mini ask.
 * `remountKey` remounts cleanly on site navigations; transcript lives in sessionStorage.
 */
export function PortfolioGuide({
  variant = "home",
  remountKey = "default",
}: PortfolioGuideProps) {
  return <PortfolioGuideInner key={remountKey} variant={variant} />;
}
