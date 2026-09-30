---
title: "What does Google require for a page to appear?"
question: "What does Google require for a page to appear?"
description: "What does Google require for a page to appear?"
published: "2026-09-30"
modified: "2026-09-30"
fill: "researched"
source: "docs/research/02_google_page_rules.md"
canonical: "/blog/what-does-google-require-for-a-page-to-appear"
---

**Google Page Ranking Rules: Meeting the Eligibility Floor and Avoiding Spam**

Google requires three technical conditions for a public HTML page to be eligible for Search: Googlebot access, an HTTP 200 response, and indexable content (supported text like HTML that avoids spam policies). Meeting this floor doesn't guarantee indexing. Spam policies list behaviors that lead to lower rankings or omission, such as cloaking, doorway pages, and hidden text, requiring a publishing system to refuse such content. Google also rewards "people-first" content, E-E-A-T (experience, expertise, authoritativeness, trustworthiness), and good page experience, but these are not pass/fail scores. Google provides no specific word count, link count, or page count requirements.

**What Google Requires for a Page to Appear**

To appear in Google Search, a page must:
*   **Be accessible to Googlebot:** It must be public and not blocked by technical controls.
*   **Return HTTP 200 (Success):** Error pages are not indexed.
*   **Contain Indexable Content:** Text in a supported format like HTML, free of spam.

Beyond these minimums, Google prioritizes content created for people, not just for search engines. This includes "people-first" writing, E-E-A-T, and good page experience. While these improve ranking, they are not specific pass/fail metrics. E-E-A-T is not a direct ranking factor, and there are no numerical cutoffs for word count, link count, or page performance metrics like Core Web Vitals. Using AI to create content is acceptable unless its main goal is to manipulate rankings.

**What Google Considers Spam or Abuse**

Google defines spam as techniques used to deceive users or manipulate search rankings. Content matching these behaviors risks lower ranking or omission.

| Policy | Prohibited Page Behavior |
| :----------------------- | :------------------------------------------------------ |
| **Cloaking** | Different content for users vs. search engines. |
| **Doorway Abuse** | Pages funneling users to less useful destinations. |
| **Expired Domain Abuse** | Reusing a bought expired domain to manipulate rank. |
| **Hacked Content** | Unauthorized content injection or modifications. |
| **Hidden Text/Links** | Content visible to search engines, not easily to users. |
| **Keyword Stuffing** | Excessive, unnatural keyword repetition. |
| **Link Spam** | Manipulative link building (e.g., buying links without `nofollow`/`sponsored`). |
| **Machine-Generated Traffic** | Automated queries to Google (e.g., scraping results). |
| **Malicious Practices** | Malware, unwanted software, back-button hijacking. |
| **Misleading Functionality** | Falsely claiming a function or service. |
| **Scaled Content Abuse** | Many low-value pages generated primarily for ranking. |
| **Scraping** | Copying content from other sites without original value. |
| **Site Reputation Policy** | Third-party content abusing host's ranking signals. |
| **Sneaky Redirects** | Users redirected to content different from crawled page. |
| **Thin Affiliation** | Copied product descriptions/reviews without added value. |
| **User-Generated Spam** | Spam added by visitors (comments, forums). |
| **Legal Removals** | [Child sexual abuse material](https://developers.google.com/search/docs/essentials/spam-policies#copyright-removal-requests), significant legal violations. |
| **Personal Info Removals** | Doxxing, non-consensual explicit imagery, fraud. |
| **Policy Circumvention** | Continuously bypassing policies with new URLs/methods. |
| **Scam and Fraud** | Impersonation, false information, deceptive pretenses. |

![Diagram of Policy | Prohibited Page Behavior and **Scam and Fraud** | Impersonation false information deceptive](content/blog/media/what-does-google-require-for-a-page-to-appear.svg)

**When a Page Must Be Refused**

A publishing system must refuse content if it:
*   Does not return HTTP 200 or is not an indexable file type (e.g., HTML).
*   Cloaks content (shows different content to users vs. crawlers).
*   Acts as a doorway page, funneling users without providing value.
*   Is published on an expired domain primarily for rank manipulation.
*   Contains hacked or unauthorized content.
*   Uses hidden text or links for ranking manipulation.
*   Engages in keyword stuffing (excessive, unnatural keyword repetition).
*   Contains link spam (e.g., bought links without `rel="sponsored"` or `rel="nofollow"`).
*   Sends automated queries to Google (e.g., scraping search results).
*   Involves malicious practices (e.g., malware, back-button hijacking).
*   Offers misleading functionality (claims services not provided).
*   Is scaled content abuse (many low-value pages made primarily for ranking).
*   Is scraped content (copied from other sites without original value).
*   Violates the site reputation policy (third-party content abusing host signals).
*   Uses sneaky redirects (users see different content than crawlers).
*   Is thin affiliation (copied affiliate content without added value).
*   Contains user-generated spam.
*   Contains child sexual abuse material, doxxing, or non-consensual explicit imagery.
*   Attempts to circumvent previously enforced policies.
*   Involves scam and fraud (impersonation, false pretenses).

**Source List**
All accessed 2026-09-29.
1.  Google. "Google Search Essentials." Last updated 2025-12-10 UTC. [https://developers.google.com/search/docs/essentials](https://developers.google.com/search/docs/essentials)
2.  Google. "Google Search technical requirements." Last updated 2025-12-18 UTC. [https://developers.google.com/search/docs/essentials/technical](https://developers.google.com/search/docs/essentials/technical)
3.  Google. "Spam policies for Google web search." Last updated 2026-08-28 UTC. [https://developers.google.com/search/docs/essentials/spam-policies](https://developers.google.com/search/docs/essentials/spam-policies)
4.  Google. "Creating helpful, reliable, people-first content." Last updated 2025-12-10 UTC. [https://developers.google.com/search/docs/fundamentals/creating-helpful-content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
5.  Google Search Help. "Content policies for Google Search." [https://support.google.com/websearch/answer/10622781](https://support.google.com/websearch/answer/10622781)
6.  Google. "File types indexable by Google." Last updated 2026-02-03 UTC. [https://developers.google.com/search/docs/crawling-indexing/indexable-file-types](https://developers.google.com/search/docs/crawling-indexing/indexable-file-types)
7.  Google. "Qualify your outbound links to Google." Last updated 2025-12-10 UTC. [https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links)
8.  Sullivan, Danny, and Chris Nelson. "Google Search's guidance about AI-generated content." Google Search Central Blog, 8 February 2023. [https://developers.google.com/search/blog/2023/02/google-search-and-ai-content](https://developers.google.com/search/blog/2023/02/google-search-and-ai-content)
9.  Google. "Understanding page experience in Google Search results." Last updated 2026-09-22 UTC. [https://developers.google.com/search/docs/appearance/page-experience](https://developers.google.com/search/docs/appearance/page-experience)
