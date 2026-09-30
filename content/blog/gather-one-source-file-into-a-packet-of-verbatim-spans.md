---
title: "Gather one source file into a packet of verbatim spans."
question: "Gather one source file into a packet of verbatim spans."
description: "Gather one source file into a packet of verbatim spans."
published: "2026-09-30"
modified: "2026-09-30"
fill: "researched"
source: "src/ada/memory/blog_packet.py"
canonical: "/blog/gather-one-source-file-into-a-packet-of-verbatim-spans"
---

This code gathers specific text from a source file and organizes it into a structured "packet." This packet is then verified and saved as part of a larger content creation process. The function ensures that only genuine content from a specified source is processed, moving it to the next stage of a workflow.

### What It Does

The main job of this code is to read a single source file and extract its content, line by line. Each meaningful line becomes a "span" of text. These spans are then bundled together into a "packet." This packet of content is designed to be used later for tasks like generating drafts or reports.

### Finding and Reading the Source

Before any content is extracted, the code ensures the source file is valid.
1.  **Locates the File:** It takes a file name (like `my/project/script.py`) and checks that it points to a real file within the project. It prevents attempts to access files outside the project or invalid paths.
2.  **Reads Content:** Once verified, the file is read. All its text is loaded for processing.

### Building and Checking the Packet

After reading the file, the code follows strict rules to build and validate the packet:
1.  **Extracts Spans:** Every non-empty line of text from the source file becomes a separate "span" in the packet.
2.  **Verifies Required Information:** The system checks that essential details for the packet (like the target audience, purpose, and the original source) are all present. If anything is missing, the packet is rejected.
3.  **Confirms Span Authenticity:** This is a key safety step. For every span extracted, the code rigorously checks that the exact text of that span truly exists within the original source file. This prevents any fabricated or incorrect information from entering the packet. If a span cannot be found in its claimed source, the entire packet is denied.

### Storing and Advancing Workflow

If the packet passes all checks, it is then saved. This step also updates the overall project workflow:
*   The verified packet, along with its associated project details, is written to persistent storage.
*   The project's status is updated. The "gather" and "gate" stages are marked as complete, and the workflow moves to the "draft" stage, ready for the next step in content generation.

This process ensures that content is reliably extracted, thoroughly validated, and correctly integrated into the broader content creation system.
