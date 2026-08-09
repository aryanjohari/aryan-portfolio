"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

import { HomeIdentity } from "@/components/motion/HomeIdentity";
import { PortfolioGuide } from "@/components/PortfolioGuide";
import { VoidNavigateContext } from "@/components/void-chrome-nav";
import { MOTION, prefersReducedMotion } from "@/lib/motion";

/**
 * Morph-first void chrome — see docs/void-chrome-transitions.md.
 * Home ↔ site: morph chrome, then router.push.
 * Site ↔ site: exit content, push, then entry shift.
 * Consistent curtain: hold `.void-chrome-page` closed across push → enter.
 */

export { useVoidChromeNavigate } from "@/components/void-chrome-nav";

/** Site ↔ site exit translate (px). */
const PAGE_EXIT_Y = -8;
/** Site ↔ site entry translate (px). */
const PAGE_ENTER_Y = 12;

const navItems = [
  {
    href: "/",
    label: "home",
    title: "Home",
    glyph: null as null,
  },
  {
    href: "/projects",
    label: "projects",
    title: "Full project catalog",
    glyph: "workshop" as const,
  },
  {
    href: "/about",
    label: "about",
    title: "Bio and background",
    glyph: "about" as const,
  },
  {
    href: "/resume.pdf",
    label: "resume",
    title: "Download PDF resume",
    glyph: "resume" as const,
  },
];

const GLYPH_SIZE = 18;

type ChromeMode = "home" | "site";

type Rect = { left: number; top: number; width: number; height: number };

function SoftGlyph({ kind }: { kind: "workshop" | "about" | "resume" }) {
  if (kind === "workshop") {
    return (
      <svg
        className="glyph-link-icon"
        viewBox="0 0 16 16"
        width={GLYPH_SIZE}
        height={GLYPH_SIZE}
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="1.5"
          y="1.5"
          width="5"
          height="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect
          x="9.5"
          y="1.5"
          width="5"
          height="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect
          x="1.5"
          y="9.5"
          width="5"
          height="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect
          x="9.5"
          y="9.5"
          width="5"
          height="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    );
  }

  if (kind === "about") {
    return (
      <svg
        className="glyph-link-icon"
        viewBox="0 0 16 16"
        width={GLYPH_SIZE}
        height={GLYPH_SIZE}
        aria-hidden="true"
        focusable="false"
      >
        <circle
          cx="8"
          cy="5"
          r="2.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M3.5 13.5c0-2.6 2-4.25 4.5-4.25s4.5 1.65 4.5 4.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className="glyph-link-icon"
      viewBox="0 0 16 16"
      width={GLYPH_SIZE}
      height={GLYPH_SIZE}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="3.5"
        y="1.5"
        width="9"
        height="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M5.5 5h5M5.5 8h5M5.5 11h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function modeFromPath(pathname: string): ChromeMode {
  return pathname === "/" ? "home" : "site";
}

function isInAppChromePath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/projects" ||
    pathname === "/about" ||
    pathname.startsWith("/projects/")
  );
}

function isInAppChromeRoute(href: string): boolean {
  const path = href.split("?")[0]?.split("#")[0] ?? "";
  return isInAppChromePath(path);
}

/** Resolve same-origin in-app href for curtain navigation; skips hashes/external. */
function resolveInAppHref(href: string): string | null {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return null;
  }

  let pathWithSearch = href;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      const url = new URL(href);
      if (url.origin !== window.location.origin) return null;
      pathWithSearch = `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  }

  const pathname = pathWithSearch.split("?")[0]?.split("#")[0] ?? "";
  if (!isInAppChromePath(pathname)) return null;
  const search = pathWithSearch.includes("?")
    ? `?${pathWithSearch.split("?")[1]?.split("#")[0] ?? ""}`
    : "";
  return `${pathname}${search}`;
}

function isCoarseOrNarrow(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 767px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function readRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function VoidChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pathMode = modeFromPath(pathname);

  const [mode, setMode] = useState<ChromeMode>(pathMode);
  const [glyphsRevealed, setGlyphsRevealed] = useState(pathMode === "site");
  const [askMountKey, setAskMountKey] = useState(() =>
    pathMode === "home" ? "home" : `site:${pathname}`,
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const askRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const modeRef = useRef(mode);
  const pathnameRef = useRef(pathname);
  const morphingRef = useRef(false);
  /** Site ↔ site exit→push→entry in flight (does not set data-chrome-morphing). */
  const pageTransitioningRef = useRef(false);
  const navSettledRef = useRef(pathMode === "site");
  /** Set before router.push after a morph we drove; cleared when pathname lands. */
  const pendingPushRef = useRef<string | null>(null);
  const prevPathRef = useRef(pathname);
  const initialPathSyncRef = useRef(true);

  modeRef.current = mode;
  pathnameRef.current = pathname;

  useEffect(() => {
    document.documentElement.dataset.voidChrome = mode;
    return () => {
      delete document.documentElement.dataset.voidChrome;
    };
  }, [mode]);

  useEffect(() => {
    if (pathMode === "home") {
      if (contentRef.current) {
        contentRef.current.style.opacity = "0";
        contentRef.current.style.pointerEvents = "none";
      }
    }
  }, [pathMode]);

  /* Home glyph rail: settle after boot only (not on return morph). */
  useEffect(() => {
    if (mode !== "home") {
      setGlyphsRevealed(true);
      return;
    }

    if (navSettledRef.current) {
      setGlyphsRevealed(true);
      return;
    }

    let cancelled = false;

    const reveal = () => {
      if (cancelled) return;
      if (prefersReducedMotion()) {
        setGlyphsRevealed(true);
        navSettledRef.current = true;
        return;
      }
      window.setTimeout(() => {
        if (!cancelled) setGlyphsRevealed(true);
      }, 900);
    };

    if (document.documentElement.dataset.bootDone === "1") {
      reveal();
      return;
    }

    const onDone = () => reveal();
    window.addEventListener("portfolio:boot-done", onDone);
    return () => {
      cancelled = true;
      window.removeEventListener("portfolio:boot-done", onDone);
    };
  }, [mode]);

  useEffect(() => {
    const el = navRef.current;
    if (!el || mode !== "home" || !glyphsRevealed) return;

    if (navSettledRef.current || morphingRef.current) {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.visibility = "visible";
      navSettledRef.current = true;
      return;
    }

    if (prefersReducedMotion()) {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.visibility = "visible";
      navSettledRef.current = true;
      return;
    }

    let cancelled = false;
    let tween: { kill: () => void } | undefined;
    const isRail = window.matchMedia("(min-width: 1024px)").matches;

    /* Hide immediately so CSS is-revealed opacity:1 doesn’t flash before GSAP. */
    el.style.opacity = "0";
    el.style.visibility = "visible";

    void import("gsap").then(({ gsap }) => {
      if (cancelled || !navRef.current || morphingRef.current) return;
      gsap.set(el, { visibility: "visible" });
      tween = gsap.fromTo(
        el,
        isRail ? { opacity: 0, x: 10 } : { opacity: 0, y: 8 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: MOTION.medium,
          ease: MOTION.ease,
          onComplete: () => {
            navSettledRef.current = true;
          },
        },
      );
    });

    return () => {
      cancelled = true;
      tween?.kill();
    };
  }, [mode, glyphsRevealed]);

  /**
   * Serialized hybrid chrome morph (both directions, soft ~15% overlaps):
   * Exit: ask → nav
   * Name: FLIP + fontSize (ask remount while companions hidden)
   * Enter: nav → ask
   * Narrow/coarse: whole-chrome crossfade.
   */
  async function tweenChrome(
    nextMode: ChromeMode,
    opts?: { askMountKey?: string },
  ): Promise<void> {
    const { gsap } = await import("gsap");
    const nameEl = nameRef.current;
    const navEl = navRef.current;
    const askEl = askRef.current;
    const root = rootRef.current;
    const morphDur = MOTION.chrome.morph;
    const morphEase = MOTION.chrome.ease;
    const beat = MOTION.chrome.crossfade;
    /** Soft overlap fraction between serial beats. */
    const overlap = 0.15;
    const overlapAt = (duration: number) => duration * (1 - overlap);

    const applyMode = () => {
      flushSync(() => {
        setMode(nextMode);
        setGlyphsRevealed(true);
        navSettledRef.current = true;
        if (opts?.askMountKey !== undefined) {
          setAskMountKey(opts.askMountKey);
        }
      });
    };

    if (isCoarseOrNarrow() || !nameEl || !navEl || !askEl) {
      document.documentElement.dataset.chromeMorphing = "1";
      if (root) {
        await new Promise<void>((resolve) => {
          gsap.to(root, {
            opacity: 0,
            duration: beat,
            ease: morphEase,
            onComplete: resolve,
          });
        });
      }

      applyMode();
      await nextFrame();

      if (root) {
        await new Promise<void>((resolve) => {
          gsap.fromTo(
            root,
            { opacity: 0 },
            {
              opacity: 1,
              duration: beat,
              ease: morphEase,
              onComplete: resolve,
            },
          );
        });
      }
      delete document.documentElement.dataset.chromeMorphing;
      return;
    }

    try {
      await document.fonts.ready;
    } catch {
      /* use current metrics */
    }

    document.documentElement.dataset.chromeMorphing = "1";
    const nameLink = nameEl.querySelector(".site-name") as HTMLElement | null;
    const first = readRect(nameEl);
    const firstFont = nameLink
      ? parseFloat(getComputedStyle(nameLink).fontSize)
      : 0;

    /* Exit — ask, then nav (soft overlap). Name stays for FLIP. */
    await new Promise<void>((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(
        askEl,
        { opacity: 0, duration: beat, ease: "power2.in" },
        0,
      );
      tl.to(
        navEl,
        { opacity: 0, duration: beat, ease: "power2.in" },
        overlapAt(beat),
      );
    });

    /*
     * Hide name before mode swap so end layout never paints,
     * remount ask while companions are still at opacity 0.
     */
    gsap.set(nameEl, { visibility: "hidden" });
    applyMode();
    await nextFrame();

    const last = readRect(nameEl);
    const lastFont = nameLink
      ? parseFloat(getComputedStyle(nameLink).fontSize)
      : 0;

    /*
     * Hold the name grid slot while the real name is position:fixed,
     * so nav/ask don’t reflow into the empty cell mid-FLIP.
     */
    const spacer = document.createElement("div");
    spacer.className = "void-chrome-name-spacer";
    spacer.setAttribute("aria-hidden", "true");
    spacer.style.cssText = [
      "grid-area:name",
      `width:${Math.max(1, last.width)}px`,
      `height:${Math.max(1, last.height)}px`,
      `min-height:${Math.max(1, last.height)}px`,
      "visibility:hidden",
      "pointer-events:none",
      "margin:0",
    ].join(";");
    nameEl.parentElement?.insertBefore(spacer, nameEl);

    try {
      gsap.set(nameEl, {
        position: "fixed",
        left: first.left,
        top: first.top,
        width: first.width,
        height: "auto",
        minHeight: first.height,
        margin: 0,
        zIndex: 50,
        opacity: 1,
        visibility: "visible",
        x: 0,
        y: 0,
        transform: "none",
      });
      if (nameLink && firstFont) {
        gsap.set(nameLink, { fontSize: firstFont });
      }
      gsap.set([navEl, askEl], {
        opacity: 0,
        visibility: "visible",
        x: 0,
        y: 0,
      });

      /* Name FLIP — alone, so it reads as the lead beat. */
      await new Promise<void>((resolve) => {
        const tl = gsap.timeline({ onComplete: resolve });
        tl.to(
          nameEl,
          {
            left: last.left,
            top: last.top,
            width: last.width,
            minHeight: last.height,
            duration: morphDur,
            ease: morphEase,
          },
          0,
        );
        if (nameLink && lastFont) {
          tl.to(
            nameLink,
            {
              fontSize: lastFont,
              duration: morphDur,
              ease: morphEase,
            },
            0,
          );
        }
      });

      /* Unpin into the reserved slot, then drop the spacer. */
      gsap.set(nameEl, {
        clearProps:
          "position,left,top,width,height,minHeight,margin,zIndex,x,y,transform",
      });
      if (nameLink) {
        gsap.set(nameLink, { clearProps: "fontSize" });
      }
    } finally {
      spacer.remove();
    }

    /* Let the live grid settle one frame before companions fade in. */
    await nextFrame();

    /* Enter — nav, then ask (soft overlap). */
    await new Promise<void>((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(
        navEl,
        { opacity: 1, duration: beat, ease: "power2.out" },
        0,
      );
      tl.to(
        askEl,
        { opacity: 1, duration: beat, ease: "power2.out" },
        overlapAt(beat),
      );
    });

    gsap.set([navEl, askEl], {
      opacity: 1,
      visibility: "visible",
      clearProps: "x,y",
    });

    if (nextMode === "home") {
      gsap.set(navEl, { opacity: 1, visibility: "visible", x: 0, y: 0 });
    }

    delete document.documentElement.dataset.chromeMorphing;
  }

  async function fadeContent(
    to: number,
    opts?: { pointerEvents?: "auto" | "none" },
  ): Promise<void> {
    const content = contentRef.current;
    if (!content) return;
    const { gsap } = await import("gsap");
    await gsap.to(content, {
      opacity: to,
      duration: MOTION.chrome.content,
      ease: MOTION.chrome.ease,
      onComplete: () => {
        if (opts?.pointerEvents) {
          content.style.pointerEvents = opts.pointerEvents;
        }
      },
    });
  }

  /** Sync — page must not paint while we await gsap / router. */
  function holdCurtainClosed(): void {
    const content = contentRef.current;
    if (!content) return;
    content.style.opacity = "0";
    content.style.pointerEvents = "none";
    document.documentElement.dataset.pageCurtain = "1";
  }

  function clearCurtainFlag(): void {
    delete document.documentElement.dataset.pageCurtain;
  }

  async function settlePageContent(): Promise<void> {
    const content = contentRef.current;
    if (!content) return;
    const { gsap } = await import("gsap");
    gsap.killTweensOf(content);
    clearCurtainFlag();
    gsap.set(content, { opacity: 1, y: 0, clearProps: "transform" });
    content.style.pointerEvents = "auto";
  }

  async function exitPageContent(): Promise<void> {
    const content = contentRef.current;
    if (!content) return;
    const { gsap } = await import("gsap");
    gsap.killTweensOf(content);
    content.style.pointerEvents = "none";
    await gsap.to(content, {
      opacity: 0,
      y: PAGE_EXIT_Y,
      duration: MOTION.chrome.pageExit,
      ease: "power2.in",
    });
    holdCurtainClosed();
  }

  async function enterPageContent(): Promise<void> {
    const content = contentRef.current;
    if (!content) return;
    holdCurtainClosed();
    window.scrollTo(0, 0);
    const portal = document.querySelector<HTMLElement>("[data-void-scroll]");
    if (portal) portal.scrollTop = 0;

    const { gsap } = await import("gsap");
    gsap.killTweensOf(content);
    clearCurtainFlag();
    content.style.pointerEvents = "auto";
    await gsap.fromTo(
      content,
      { opacity: 0, y: PAGE_ENTER_Y },
      {
        opacity: 1,
        y: 0,
        duration: MOTION.chrome.pageEnter,
        ease: MOTION.ease,
        clearProps: "transform",
      },
    );
  }

  /**
   * Primary navigation: morph chrome when home ↔ site, then push.
   * Site ↔ site: exit content, then push; entry on pathname settle.
   * Curtain stays closed from exit/morph through enter.
   */
  async function navigate(href: string): Promise<void> {
    const target = resolveInAppHref(href) ?? (isInAppChromeRoute(href) ? href : null);
    if (!target) {
      window.location.assign(href);
      return;
    }

    if (
      target === pathnameRef.current ||
      morphingRef.current ||
      pageTransitioningRef.current
    ) {
      return;
    }

    const fromMode = modeRef.current;
    const toMode = modeFromPath(target);

    if (prefersReducedMotion()) {
      flushSync(() => {
        setMode(toMode);
        setGlyphsRevealed(true);
        navSettledRef.current = true;
        setAskMountKey(toMode === "site" ? `site:${target}` : "home");
      });
      pendingPushRef.current = target;
      router.push(target);
      return;
    }

    /* Same chrome mode: exit current page, then push; entry on settle. */
    if (fromMode === toMode) {
      pageTransitioningRef.current = true;
      try {
        await exitPageContent();
        holdCurtainClosed();
        pendingPushRef.current = target;
        router.push(target);
      } catch {
        await settlePageContent();
        pageTransitioningRef.current = false;
      }
      return;
    }

    morphingRef.current = true;
    pageTransitioningRef.current = true;
    document.documentElement.dataset.chromeMorphing = "1";

    try {
      /* Leaving a site page: fade body out while still on that route. */
      if (fromMode === "site" && contentRef.current) {
        await fadeContent(0, { pointerEvents: "none" });
      }

      await tweenChrome(toMode, {
        askMountKey: toMode === "site" ? `site:${target}` : "home",
      });

      /* Keep curtain closed while the next route mounts. */
      holdCurtainClosed();
      pendingPushRef.current = target;
      router.push(target);
    } catch {
      await settlePageContent();
      pageTransitioningRef.current = false;
    } finally {
      morphingRef.current = false;
      delete document.documentElement.dataset.chromeMorphing;
    }
  }

  function onChromeNavClick(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    if (!isInAppChromeRoute(href)) return;
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    void navigate(href);
  }

  function onContentNavigateClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented) return;
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    const anchor = (event.target as Element | null)?.closest?.("a[href]");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href) return;
    const target = resolveInAppHref(href);
    if (!target) return;
    event.preventDefault();
    void navigate(target);
  }

  /* Pre-paint: hold curtain closed on site landings so back/forward can't flash. */
  useLayoutEffect(() => {
    if (initialPathSyncRef.current) return;
    if (prevPathRef.current === pathname) return;
    if (modeFromPath(pathname) !== "site") return;
    if (prefersReducedMotion()) return;
    holdCurtainClosed();
  }, [pathname]);

  /* Pathname landed — settle content / sync chrome for back-forward & other Links. */
  useEffect(() => {
    if (initialPathSyncRef.current) {
      initialPathSyncRef.current = false;
      prevPathRef.current = pathname;
      if (contentRef.current) {
        contentRef.current.style.opacity = pathMode === "home" ? "0" : "1";
        contentRef.current.style.pointerEvents =
          pathMode === "home" ? "none" : "auto";
      }
      clearCurtainFlag();
      return;
    }

    const prev = prevPathRef.current;
    if (prev === pathname) return;
    prevPathRef.current = pathname;

    const pending = pendingPushRef.current;
    const drivenByUs = pending === pathname;
    pendingPushRef.current = null;

    const nextMode = modeFromPath(pathname);
    let cancelled = false;

    const cleanupPageTween = () => {
      cancelled = true;
      const content = contentRef.current;
      if (content) {
        void import("gsap").then(({ gsap }) => {
          gsap.killTweensOf(content);
        });
      }
      /* Never leave a site page stuck hidden; do not force-show on home. */
      if (modeFromPath(pathnameRef.current) === "site") {
        void settlePageContent();
      }
      pageTransitioningRef.current = false;
    };

    /* Morph-first / site↔site navigate already set mode; reveal content. */
    if (drivenByUs) {
      if (nextMode === "site") {
        setAskMountKey(`site:${pathname}`);
        if (prefersReducedMotion()) {
          void settlePageContent().then(() => {
            pageTransitioningRef.current = false;
          });
        } else {
          void (async () => {
            try {
              await enterPageContent();
            } finally {
              if (cancelled) {
                if (modeFromPath(pathnameRef.current) === "site") {
                  await settlePageContent();
                }
              }
              pageTransitioningRef.current = false;
            }
          })();
        }
      } else {
        setAskMountKey("home");
        holdCurtainClosed();
        pageTransitioningRef.current = false;
      }
      return cleanupPageTween;
    }

    /* Back/forward or Link outside VoidChrome — curtain already closed in layout. */
    void (async () => {
      if (morphingRef.current || cancelled) return;

      if (modeRef.current === nextMode) {
        setAskMountKey(
          nextMode === "site" ? `site:${pathname}` : "home",
        );
        if (nextMode === "site") {
          if (prefersReducedMotion()) {
            await settlePageContent();
          } else {
            await enterPageContent();
          }
        } else {
          holdCurtainClosed();
        }
        return;
      }

      /* Path and chrome disagree — sync (page already swapped). */
      if (prefersReducedMotion()) {
        flushSync(() => {
          setMode(nextMode);
          setGlyphsRevealed(true);
          navSettledRef.current = true;
          setAskMountKey(
            nextMode === "site" ? `site:${pathname}` : "home",
          );
        });
        if (contentRef.current) {
          contentRef.current.style.opacity = nextMode === "home" ? "0" : "1";
          contentRef.current.style.pointerEvents =
            nextMode === "home" ? "none" : "auto";
        }
        clearCurtainFlag();
        return;
      }

      morphingRef.current = true;
      try {
        holdCurtainClosed();
        await tweenChrome(nextMode, {
          askMountKey:
            nextMode === "site" ? `site:${pathname}` : "home",
        });
        if (cancelled) return;
        if (nextMode === "site") {
          await enterPageContent();
        }
      } finally {
        morphingRef.current = false;
        delete document.documentElement.dataset.chromeMorphing;
        pageTransitioningRef.current = false;
      }
    })();

    return cleanupPageTween;
  }, [pathname, pathMode]);

  const guideVariant = mode === "home" ? "home" : "mini";
  const navRevealed = mode === "site" || glyphsRevealed;

  return (
    <VoidNavigateContext.Provider value={navigate}>
      <div
        ref={rootRef}
        className={`void-chrome void-chrome--${mode}`}
        data-void-chrome={mode}
      >
        <header className="void-chrome-header site-header">
          <div
            className="site-header-accent void-chrome-accent"
            aria-hidden="true"
          />
          <div className="void-chrome-inner site-header-inner">
            <div
              ref={nameRef}
              className="void-chrome-name"
              data-chrome-flip="name"
            >
              <HomeIdentity
                scramble={mode === "home"}
                onNavigate={(event) => onChromeNavClick(event, "/")}
              />
            </div>

            <nav
              ref={navRef}
              className={`void-chrome-nav home-glyph-row site-nav${
                navRevealed ? " is-revealed" : ""
              }`}
              aria-label="Main"
              {...(mode === "home" && !navRevealed ? { inert: true } : {})}
            >
              {navItems.map((item, index) => {
                const siteOnly = item.href === "/";
                const inAppRoute = isInAppChromeRoute(item.href);
                const linkClassName = item.glyph
                  ? "glyph-link void-chrome-nav-link"
                  : "void-chrome-nav-link";
                const linkContent = (
                  <>
                    {item.glyph ? <SoftGlyph kind={item.glyph} /> : null}
                    <span className="glyph-link-label">{item.label}</span>
                  </>
                );
                return (
                  <span
                    key={item.href}
                    className={`void-chrome-nav-item site-nav-item${
                      siteOnly ? " void-chrome-nav-item--site-only" : ""
                    }`}
                  >
                    {index > 0 && (
                      <span className="site-nav-sep" aria-hidden="true">
                        {" "}
                        ·{" "}
                      </span>
                    )}
                    {inAppRoute ? (
                      <Link
                        href={item.href}
                        title={item.title}
                        className={linkClassName}
                        onClick={(event) => onChromeNavClick(event, item.href)}
                      >
                        {linkContent}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        title={item.title}
                        className={linkClassName}
                      >
                        {linkContent}
                      </a>
                    )}
                  </span>
                );
              })}
            </nav>

            <div
              ref={askRef}
              className="void-chrome-ask"
              data-chrome-flip="ask"
            >
              <PortfolioGuide variant={guideVariant} remountKey={askMountKey} />
            </div>
          </div>
        </header>
      </div>

      <div
        ref={contentRef}
        className={`void-chrome-page${mode === "home" ? " void-chrome-page--home" : ""}`}
        onClick={onContentNavigateClick}
      >
        {children}
      </div>
    </VoidNavigateContext.Provider>
  );
}
