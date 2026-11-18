"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, type KeyboardEvent, useEffect, useEffectEvent, useId, useRef, useState } from "react";

import type { AskReply } from "@/lib/ask/answer";
import { QUESTION_MAX_CHARS } from "@/lib/ask/answer";
import { askQuestion } from "@/lib/ask/client";
import { ASK_PAGE_URL } from "@/lib/ask/sections";
import { type AskPages, suggestionsFor } from "@/lib/ask/suggestions";

/** Fired by an "Ask →" line elsewhere on the page; the Ask box opens and asks its question. */
const ASK_EVENT = "ask:question";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "answered"; reply: AskReply } | { kind: "failed"; message: string };

/**
 * The Ask box (mockups/home-editorial.html). Desktop: an input in the header
 * whose panel drops down on focus. Phone: an "Ask" button that opens the same
 * form as a bottom sheet. Every action is a link the visitor clicks; nothing
 * runs on its own. Hidden with JS off by a <noscript> style in the layout.
 * Its suggestions and the page it sends with a question follow the page being read.
 */
export function AskBox({ pages }: { pages: AskPages }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  // True while the phone bottom sheet is showing; only then is the box a modal dialog.
  const [isSheet, setIsSheet] = useState(false);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const rootRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const labelId = useId();
  // Set by the phone "Ask" button: the input is hidden until the sheet renders, so focus waits for that.
  const focusInputOnOpen = useRef(false);

  function close() {
    setOpen(false);
    // On a phone, focus goes back to the "Ask" button that opened the sheet.
    if (triggerRef.current?.offsetParent) triggerRef.current.focus();
  }

  useEffect(() => {
    if (open && focusInputOnOpen.current) {
      focusInputOnOpen.current = false;
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /** On a phone the open sheet covers the page, so Tab wraps around inside it instead of reaching hidden links. */
  function keepFocusInSheet(event: KeyboardEvent<HTMLFormElement>) {
    const isSheet = Boolean(triggerRef.current?.offsetParent);
    if (!open || !isSheet || !rootRef.current) return;
    const focusable = [...rootRef.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || status.kind === "loading") return;
    setQuestion(trimmed);
    setStatus({ kind: "loading" });
    const result = await askQuestion(trimmed, pathname);
    setStatus(result.ok ? { kind: "answered", reply: result.reply } : { kind: "failed", message: result.message });
  }

  /** Phone: the "Ask AI" button is showing, and the form lives in a bottom sheet. */
  const isPhone = () => Boolean(triggerRef.current?.offsetParent);

  const askFromElsewhere = useEffectEvent((text: string) => {
    if (isPhone()) setIsSheet(true);
    setOpen(true);
    // Desktop: focusing the header input brings the box into view.
    if (!isPhone()) inputRef.current?.focus();
    void submit(text);
  });

  const focusFromShortcut = useEffectEvent((event: globalThis.KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const typing = target?.closest("input, textarea, select, [contenteditable='true']");
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || typing || isPhone()) return;
    event.preventDefault();
    inputRef.current?.focus();
  });

  useEffect(() => {
    const onAsk = (event: Event) => askFromElsewhere((event as CustomEvent<{ question: string }>).detail.question);
    window.addEventListener(ASK_EVENT, onAsk);
    document.addEventListener("keydown", focusFromShortcut);
    return () => {
      window.removeEventListener(ASK_EVENT, onAsk);
      document.removeEventListener("keydown", focusFromShortcut);
    };
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(question);
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="ask-trigger"
        type="button"
        aria-expanded={open}
        onClick={() => {
          focusInputOnOpen.current = true;
          setIsSheet(true);
          setOpen(true);
        }}
      >
        Ask AI
      </button>

      {/* A <form> can't take role="dialog", so this wrapper carries it while the phone sheet is open. */}
      <div
        className="ask"
        data-open={open}
        {...(open && isSheet && { role: "dialog", "aria-modal": true, "aria-labelledby": labelId })}
      >
        <form
          ref={rootRef}
          aria-label="Ask about Aryan's work"
          onSubmit={onSubmit}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
            if (event.key === "Tab") keepFocusInSheet(event);
          }}
        >
          <div className="sheet-head">
            <label id={labelId} className="section-no" htmlFor={inputId}>
              Ask about my work
            </label>
            <button className="sheet-close" type="button" onClick={close}>
              Close ✕
            </button>
          </div>

          <div className="ask-row">
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              placeholder="Ask about my work…"
              autoComplete="off"
              maxLength={QUESTION_MAX_CHARS}
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                setOpen(true);
              }}
              // Click as well as focus: after Escape the input keeps focus, so a click must reopen it.
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              aria-keyshortcuts="/"
            />
            <kbd className="ask-kbd" aria-hidden="true">
              /
            </kbd>
            <button type="submit" disabled={status.kind === "loading"}>
              Ask →
            </button>
          </div>

          <div className="ask-panel">
            {status.kind === "idle" && (
              <div className="chips">
                {suggestionsFor(pathname, pages).map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => void submit(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div className="answer" aria-live="polite">
              {status.kind === "loading" && <p className="ask-note">Thinking…</p>}
              {status.kind === "failed" && <p className="ask-note">{status.message}</p>}
              {status.kind === "answered" && <AnswerView reply={status.reply} onNavigate={() => setOpen(false)} />}
            </div>
            <p className="ask-how">
              <Link href={ASK_PAGE_URL} onClick={() => setOpen(false)}>
                How this works →
              </Link>
            </p>
          </div>
        </form>
      </div>
    </>
  );
}

function AnswerView({ reply, onNavigate }: { reply: AskReply; onNavigate: () => void }) {
  return (
    <>
      <p>{reply.answer}</p>
      {reply.sources.length > 0 && (
        <p className="source">
          From:{" "}
          {reply.sources.map((source, index) => (
            <span key={source.id}>
              {index > 0 && " · "}
              <Link href={source.url} onClick={onNavigate}>
                {source.title}
              </Link>
            </span>
          ))}
        </p>
      )}
      {reply.actions.length > 0 && (
        <p className="ask-actions">
          {reply.actions.map((action) => {
            if (action.kind === "page") {
              return (
                <Link key={action.href} href={action.href} onClick={onNavigate}>
                  {action.label} →
                </Link>
              );
            }
            if (action.kind === "demo") {
              return (
                <a key={action.href} href={action.href} target="_blank" rel="noopener noreferrer">
                  {action.label} ↗<span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              );
            }
            return (
              <a key={action.href} href={action.href}>
                {action.label} ✉
              </a>
            );
          })}
        </p>
      )}
    </>
  );
}

/** An "Ask →" line for the end of a section: opens the Ask box and asks `question`. Hidden with JS off. */
export function AskInvite({ lead, question }: { lead: string; question: string }) {
  return (
    <p className="ask-invite">
      {lead}{" "}
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: { question } }))}>
        Ask →
      </button>
    </p>
  );
}
