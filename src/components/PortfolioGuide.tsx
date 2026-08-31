"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

import { useVoidChromeNavigate } from "@/components/void-chrome-nav";
import guideContext from "@/lib/guide-context.json";
import {
  isResumePath,
  validateNavigateTo,
} from "@/lib/guide-navigate";
import type { SuggestedChip } from "@/lib/guide-schema";
import {
  prefersReducedMotion,
} from "@/lib/motion";

const SITE_PATH_PATTERN =
  /(\/(?:projects(?:\/[a-z0-9-]+)?|about|workshop|resume\.pdf))/g;

const TYPEWRITER_CPS = 32;
const TYPEWRITER_MAX_MS = 3000;
const HISTORY_PAIRS = 3;
const MAX_SESSION_ASKS = 10;
const STORAGE_KEY = "portfolio-guide:v1";
/** Live stage whisper — full reply available via more/expand. */
const WHISPER_MAX_CHARS = 360;
const SESSION_CAP_MESSAGE =
  "That’s enough for this visit — close the tab or clear history to ask again later.";

const HOME_SUGGESTED_CHIPS = guideContext.suggestedChips as SuggestedChip[];

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

/**
 * Recover a human reply from older session turns that stored leaked JSON.
 * Drops turns that are unusable JSON with no recoverable `reply`.
 */
function scrubModelTurnText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const unfenced = fenceMatch?.[1]?.trim() ?? trimmed;
  const looksJson =
    unfenced.startsWith("{") ||
    /"reply"\s*:/.test(unfenced) ||
    trimmed.startsWith("```");

  if (!looksJson) return trimmed;

  const tryParse = (candidate: string): string | null => {
    try {
      const parsed = JSON.parse(candidate) as { reply?: unknown };
      if (typeof parsed.reply === "string" && parsed.reply.trim()) {
        return parsed.reply.trim();
      }
    } catch {
      // ignore
    }
    return null;
  };

  const direct = tryParse(unfenced);
  if (direct) return direct;

  const start = unfenced.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < unfenced.length; i++) {
      const ch = unfenced[i];
      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === "\\") {
          escape = true;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          const extracted = tryParse(unfenced.slice(start, i + 1));
          if (extracted) return extracted;
          break;
        }
      }
    }
  }

  const dumpAt = trimmed.search(/\{[\s\S]*"reply"\s*:/);
  if (dumpAt > 0) {
    const before = trimmed.slice(0, dumpAt).trim();
    if (before && !before.includes('"reply"')) return before;
  }

  return "";
}

function scrubTurns(turns: TranscriptTurn[]): TranscriptTurn[] {
  const cleaned: TranscriptTurn[] = [];
  for (const turn of turns) {
    if (turn.role === "user") {
      cleaned.push(turn);
      continue;
    }
    const text = scrubModelTurnText(turn.text);
    if (!text) continue;
    cleaned.push(text === turn.text ? turn : { ...turn, text });
  }
  return cleaned;
}

/** Short live-stage whisper; expand reveals the rest intentionally. */
function truncateToWhisper(text: string): {
  preview: string;
  needsExpand: boolean;
} {
  if (text.length <= WHISPER_MAX_CHARS) {
    return { preview: text, needsExpand: false };
  }

  const slice = text.slice(0, WHISPER_MAX_CHARS);
  const sentenceBreak = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("! "),
  );
  let cut = WHISPER_MAX_CHARS;
  if (sentenceBreak >= WHISPER_MAX_CHARS * 0.55) {
    cut = sentenceBreak + 1;
  } else {
    const spaceBreak = slice.lastIndexOf(" ");
    if (spaceBreak >= WHISPER_MAX_CHARS * 0.55) {
      cut = spaceBreak;
    }
  }

  return {
    preview: text.slice(0, cut).trimEnd(),
    needsExpand: true,
  };
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
      turns: scrubTurns(
        parsed.turns.filter(
          (turn) =>
            turn &&
            typeof turn.id === "string" &&
            (turn.role === "user" || turn.role === "model") &&
            typeof turn.text === "string",
        ),
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
 * Home-only identity tags — sits above the ask bar, not under the name.
 */
function HomeTagline() {
  return (
    <div className="home-identity-tagline" aria-hidden="true">
      <p className="home-identity-tags">systems · ai · research</p>
      <p className="home-identity-subline">engineer · auckland</p>
    </div>
  );
}

/**
 * Home-only suggested prompts — fills the input; visitor sends when ready.
 */
type GuideChipsProps = {
  disabled: boolean;
  onChipClick: (chip: SuggestedChip) => void;
};

function GuideChips({ disabled, onChipClick }: GuideChipsProps) {
  return (
    <div
      className="portfolio-guide-chips"
      role="group"
      aria-label="Suggested questions"
    >
      {HOME_SUGGESTED_CHIPS.map((chip) => (
        <button
          key={chip.label}
          type="button"
          className={`portfolio-guide-chip${
            chip.kind === "navigate" ? " portfolio-guide-chip--nav" : ""
          }`}
          disabled={disabled}
          title={chip.tooltip}
          onClick={() => onChipClick(chip)}
        >
          {chip.label}
        </button>
      ))}
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
  expanded: boolean;
  needsExpand: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  liveRef: RefObject<HTMLDivElement | null>;
};

function LiveReply({
  isLoading,
  status,
  errorMessage,
  latestModel,
  visibleText,
  typing,
  expanded,
  needsExpand,
  onExpand,
  onCollapse,
  liveRef,
}: LiveReplyProps) {
  const idle = !isLoading && status !== "error" && !latestModel;
  const showMore = Boolean(latestModel) && needsExpand && !expanded && !typing;
  const showLess = Boolean(latestModel) && needsExpand && expanded && !typing;
  const whisper = latestModel
    ? truncateToWhisper(latestModel.text)
    : null;
  const displayText =
    latestModel && whisper
      ? expanded
        ? latestModel.text
        : needsExpand
          ? `${whisper.preview}…`
          : latestModel.text
      : "";

  return (
    <div
      className={`portfolio-guide-live-stack${
        idle ? " portfolio-guide-live-stack--idle" : ""
      }`}
    >
      <div
        ref={liveRef}
        className={`portfolio-guide-live${
          isLoading ? " portfolio-guide-live--loading" : ""
        }${idle ? " portfolio-guide-live--idle" : ""}${
          expanded ? " portfolio-guide-live--expanded" : ""
        }`}
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
            {typing ? visibleText : linkifyReply(displayText)}
          </p>
        )}
      </div>
      {/* Expand controls sit outside the clipped live region so more/less stay visible */}
      {showMore && (
        <button
          type="button"
          className="portfolio-guide-live-more"
          onClick={onExpand}
        >
          more
        </button>
      )}
      {showLess && (
        <button
          type="button"
          className="portfolio-guide-live-more"
          onClick={onCollapse}
        >
          less
        </button>
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

/** Quiet glyph entry; full transcript mounts only while the overlay is open. */
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
  const navigate = useVoidChromeNavigate();
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
  const [liveExpandedId, setLiveExpandedId] = useState<string | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);
  const [autoNavigatePath, setAutoNavigatePath] = useState<string | null>(
    null,
  );
  const liveRef = useRef<HTMLDivElement>(null);
  const miniPanelBodyRef = useRef<HTMLDivElement>(null);
  const historyListRef = useRef<HTMLOListElement>(null);
  const historyGlyphRef = useRef<HTMLButtonElement>(null);
  const historyCloseRef = useRef<HTMLButtonElement>(null);
  const navGoRef = useRef<HTMLButtonElement>(null);
  const inputId =
    variant === "mini" ? "guide-message-mini" : "guide-message";

  useEffect(() => {
    const stored = loadSession();
    // sessionStorage hydrate — client-only; must not run in useState init (SSR mismatch)
    // Mini panel + history stay closed on hydrate; user opens them via ask / glyph.
    startTransition(() => {
      if (stored) {
        setTurns(stored.turns);
        setVisitMemory(stored.visitMemory);
      }
      setHydrated(true);
    });
  }, []);

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
  const liveExpanded =
    latestModel !== null && liveExpandedId === latestModel.id;
  const whisper = latestModel
    ? truncateToWhisper(latestModel.text)
    : null;
  const typewriterActive =
    typingTurnId !== null &&
    latestModel?.id === typingTurnId &&
    !liveExpanded;
  const typewriterSource =
    typewriterActive && whisper
      ? whisper.needsExpand
        ? `${whisper.preview}…`
        : whisper.preview
      : null;
  const { visibleText, done: typingDone } = useTypewriter(
    typewriterSource,
    typewriterActive,
  );

  /* Keep live reply top stable; scroll panel body on mini when reply changes. */
  useEffect(() => {
    const scrollEl =
      variant === "mini" ? miniPanelBodyRef.current : liveRef.current;
    if (!scrollEl) return;
    scrollEl.scrollTop = 0;
  }, [latestModel?.id, status, liveExpanded, variant]);

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

  function goToPath(path: string) {
    const destination = validateNavigateTo(path);
    if (!destination) {
      focusAskInput();
      return;
    }
    if (isResumePath(destination)) {
      window.location.assign(destination);
      return;
    }
    void navigate(destination);
  }

  /* Explicit go-intent: finish the whisper, then teleport. */
  useEffect(() => {
    if (!autoNavigatePath) return;
    if (typewriterActive && !typingDone) return;
    const path = autoNavigatePath;
    setAutoNavigatePath(null);
    goToPath(path);
    // navigate / focusAskInput are stable enough for this settle effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNavigatePath, typewriterActive, typingDone]);

  function clearHistory() {
    setTurns([]);
    setVisitMemory("");
    setErrorMessage(null);
    setStatus("idle");
    setTypingTurnId(null);
    setLiveExpandedId(null);
    setPendingNavigate(null);
    setAutoNavigatePath(null);
    setHistoryOpen(false);
    clearSessionStorage();
    focusAskInput();
  }

  function closeHistory() {
    setHistoryOpen(false);
    queueMicrotask(() => historyGlyphRef.current?.focus());
  }

  function toggleHistory() {
    setHistoryOpen((prev) => {
      const next = !prev;
      // Opening history collapses live expand so the page stage stays quiet.
      if (next) setLiveExpandedId(null);
      return next;
    });
  }

  function dismissNavigateConfirm() {
    setPendingNavigate(null);
    focusAskInput();
  }

  function confirmNavigate() {
    const path = pendingNavigate;
    setPendingNavigate(null);
    if (!path) {
      focusAskInput();
      return;
    }
    goToPath(path);
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
    setLiveExpandedId(null);
    setPendingNavigate(null);
    setAutoNavigatePath(null);
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
        autoNavigate?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Could not reach the guide.");
        return;
      }

      const reply = scrubModelTurnText(data.reply ?? "") || "No reply received.";
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
      if (destination && data.autoNavigate === true) {
        setPendingNavigate(null);
        setAutoNavigatePath(destination);
      } else {
        setAutoNavigatePath(null);
        setPendingNavigate(destination ?? null);
      }
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
  const showLiveSurface =
    Boolean(latestModel) ||
    isLoading ||
    status === "error" ||
    Boolean(pendingNavigate);
  const typing =
    Boolean(typingTurnId) && !typingDone && latestModel?.id === typingTurnId;
  const showConfirm =
    Boolean(pendingNavigate) && !isLoading && status !== "error";
  const needsExpand = Boolean(whisper?.needsExpand);

  const liveBlock = (
    <LiveReply
      isLoading={isLoading}
      status={status}
      errorMessage={errorMessage}
      latestModel={latestModel}
      visibleText={visibleText}
      typing={typing}
      expanded={liveExpanded}
      needsExpand={needsExpand}
      onExpand={() => {
        if (latestModel) setLiveExpandedId(latestModel.id);
        setTypingTurnId(null);
      }}
      onCollapse={() => setLiveExpandedId(null)}
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

  function applyChip(chip: SuggestedChip) {
    if (chip.kind === "navigate") {
      void submitQuestion(chip.prompt);
      return;
    }
    setMessage(chip.prompt);
    focusAskInput();
  }

  const hintsBlock = !isMini ? (
    <GuideChips
      disabled={isLoading || atSessionCap}
      onChipClick={applyChip}
    />
  ) : null;

  return (
    <section
      className={`portfolio-guide portfolio-guide--${variant}`}
      aria-label="Ask Aryan"
    >
      <div className="portfolio-guide-stage">
        {!isMini ? <HomeTagline /> : null}
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
                    isMini ? "ask · explain…" : "ask anything…"
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
            data-void-scroll-exempt
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
            <div
              ref={miniPanelBodyRef}
              className="portfolio-guide-mini-panel-body"
            >
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
