"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import type { AskReply } from "@/lib/ask/answer";
import { QUESTION_MAX_CHARS } from "@/lib/ask/answer";
import { askQuestion } from "@/lib/ask/client";

const SUGGESTED_QUESTIONS = [
  "What's he best at?",
  "Which project should I look at first?",
  "Is he open to roles in Auckland?",
];

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "answered"; reply: AskReply } | { kind: "failed"; message: string };

/**
 * The Ask box (mockups/home-editorial.html). Desktop: an input in the header
 * whose panel drops down on focus. Phone: an "Ask" button that opens the same
 * form as a bottom sheet. Every action is a link the visitor clicks; nothing
 * runs on its own. Hidden with JS off by a <noscript> style in the layout.
 */
export function AskBox() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const rootRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
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

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || status.kind === "loading") return;
    setQuestion(trimmed);
    setStatus({ kind: "loading" });
    const result = await askQuestion(trimmed);
    setStatus(result.ok ? { kind: "answered", reply: result.reply } : { kind: "failed", message: result.message });
  }

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
          setOpen(true);
        }}
      >
        Ask
      </button>

      <form
        ref={rootRef}
        className="ask"
        data-open={open}
        aria-label="Ask about Aryan's work"
        onSubmit={onSubmit}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      >
        <div className="sheet-head">
          <label className="section-no" htmlFor={inputId}>
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
          />
          <button type="submit" disabled={status.kind === "loading"}>
            Ask →
          </button>
        </div>

        <div className="ask-panel">
          {status.kind === "idle" && (
            <div className="chips">
              {SUGGESTED_QUESTIONS.map((suggestion) => (
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
        </div>
      </form>
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
