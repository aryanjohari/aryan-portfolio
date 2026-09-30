---
title: "What does this file answer about Access date for every source below:?"
question: "What does this file answer about Access date for every source below:?"
description: "What does this file answer about Access date for every source below:?"
published: "2026-09-30"
modified: "2026-09-30"
fill: "researched"
source: "docs/research/01_how_discovery_works.md"
canonical: "/blog/what-does-this-file-answer-about-access-date-for-every-source-below"
---

This document confirms that all cited sources were accessed on 2026-09-29. This uniform access date ensures the information presented is current and consistently grounded in the policies and research available at that time regarding search engine operations.

For Google, all search surfaces—SEO, answer boxes (AEO), and AI Overviews (GEO)—read the same public HTML page. There is no separate file or special markup needed for a page to appear in different Google search features. Our website can use one well-structured public page to serve all these needs.

### One Page for All Google Search Surfaces

Google's core ranking systems, featured snippets (answer boxes), and generative AI features (AI Overviews, AI Mode) all rely on a single source: one public HTML URL. This page must be fetchable by Googlebot, renderable, indexable, and eligible for a snippet. Google does not require separate files, unique technical setups, or specific schema for a page to be considered for these various surfaces.

### What Each Search Surface Reads

*   **SEO (Search Engine Optimization)**
    Googlebot crawls and indexes public HTML pages. These pages are then ranked based on hundreds of factors. The result is a link to the page, often with a short snippet from its content. The ranked unit remains the entire page, even if passage ranking identifies relevant sections within it.
*   **AEO (Answer Engine Optimization) — Answer Boxes**
    "AEO" here means Google's featured snippets and People Also Ask boxes. Google programmatically extracts a short piece of text directly from an already indexed, snippet-eligible page. This snippet is then displayed as a direct answer. A website owner cannot request a featured snippet. The piece comes from the page, not a separate file.
*   **GEO (Generative Engine Optimization) — Google's AI Answers**
    Google's AI Overviews and AI Mode write new answers by reviewing information from several retrieved pages from its Search index. They then show clickable links to those supporting pages. To be a supporting link, a page must be indexed and eligible for a snippet. Google states there are no additional technical requirements or special schema for these features. Content needs to be in accessible HTML text.
*   **Academic Generative Engines**
    Academic research on GEO (e.g., Aggarwal et al.) describes experiments where a generator cites sources *after* they have already been retrieved (often from Google's top results). While these studies suggest tactics like adding statistics can increase citation share *within that fixed context*, Google does not state these are requirements for its own AI Overviews or AI Mode.

### What This Means for Our Site

Our portfolio site (Next.js on Vercel) can serve a single public HTML URL that Googlebot fetches. This one page can meet the requirements for all Google Search surfaces:
*   Ensure the page is crawlable and indexable.
*   Make sure content is in visible HTML text, not just in backend configuration files (like `portfolio.yaml`).
*   Allow snippets (`nosnippet` should not be present).
*   Maintain a clear, stable canonical URL.

Separate URLs or content variations for "SEO," "AEO," and "GEO" are unnecessary and could conflict with Google's indexing processes.

### What We Are Not Chasing

We are not pursuing these tactics for our site, as they are either unnecessary, unproven, or ineffective based on current evidence:
*   `llms.txt`, Markdown twins, or other special AI markup.
*   Chunking page content for models or special schema types for AI Overviews.
*   Keyword stuffing.
*   Rewriting pages specifically for AI models with added statistics or quotations (as a general requirement, distinct from good content).
*   Paying for crawl frequency or higher rankings.
*   Vendor-specific GEO or AEO playbooks that conflict with Google's guidance.
*   Content living only in internal systems (like `portfolio.yaml`, internal organs, Pi, or S3 `page.json`) as this is invisible to crawlers.

### How We Would Prove This Wrong

This strategy would be disproven if any of the following occur:
1.  Google officially documents a separate file or method, beyond the indexed, snippet-eligible HTML page, as required for featured snippets, AI Overviews, or AI Mode.
2.  A page explicitly marked `noindex` or `nosnippet` is used by Google as a featured snippet or a direct input to AI Overviews/AI Mode.
3.  Google explicitly states that its AI-feature eligibility requires academic GEO rewrite methods (e.g., added statistics, quotations, or citations).
4.  A Google featured snippet or AI citation on our site quotes facts present only in internal data (`portfolio.yaml`, internal organs, S3 `page.json`) and not in the rendered HTML.
5.  Google's systems clearly demonstrate that the three surfaces (SEO, AEO, GEO) require three distinct URLs for the same factual content.
