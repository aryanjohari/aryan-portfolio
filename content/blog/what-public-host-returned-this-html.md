---
title: "What public host returned this HTML?"
question: "What public host returned this HTML?"
description: "What public host returned this HTML?"
published: "2026-10-01"
modified: "2026-10-01"
fill: "researched"
source: "docs/research/04_pipeline_steps.md"
canonical: "/blog/what-public-host-returned-this-html"
---

The work described in this document is published on `github.com/aryanjohari/aryan-portfolio`. This public repository hosts blog posts. These posts are markdown files. They are converted into public HTML pages for the site.

### About this Work

This document outlines a plan for publishing blog content. It details the process for creating, reviewing, and deploying new articles. The system automates many steps. It still keeps a human in charge of final approvals.

### How Content Gets Published

A blog post goes through six main stages. First, the system stores information for a new article. This includes its topic, audience, and source. Second, it gathers content for the article from a specific research document. Third, it drafts a markdown file. This file includes all necessary details for a blog post. It does not paste source material directly. Fourth, the draft waits for a human operator to confirm it. Once confirmed, the system copies the article to the designated GitHub repository. Fifth, the operator can delete the article. They can also publish a new version later. Finally, this process focuses only on getting the file to the repository. It does not handle the final step of pushing changes to Git or publishing to other platforms.

### Operator Approval is Key

After the system drafts an article, it pauses. It waits for the operator to review the draft. The operator must confirm the article before it is published. This ensures human oversight. The operator can also confirm a deletion. This removes an article from the repository. It also clears the way for a new version of the same article.

### Rules for Content

The system follows strict rules for creating articles. Each article needs a specific title, question, and description. It must be based on facts from a single source document. The system creates a unique web address (slug) for each article. This slug must be short. It cannot contain images unless the source material has one. The target repository `github.com/aryanjohari/aryan-portfolio` is the only allowed destination.

### What This System Does Not Do

This plan focuses on writing and approving article files. It does not automatically push changes to Git. It does not connect to services like Google Search Console. It does not publish to other websites. It also does not create JSON files or generate images. This system is a core part of content generation, but not the entire publishing pipeline.
