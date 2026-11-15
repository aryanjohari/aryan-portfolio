import type { Metadata } from "next";

import { ChapteredPage } from "@/components/ChapteredPage";
import { getProfile } from "@/lib/profile";
import { getAskPageText } from "@/lib/site-text-files";

export function generateMetadata(): Metadata {
  return { title: `How the Ask box works · ${getProfile().name}`, description: getAskPageText().summary };
}

/** Text from content/ask.md, in the story page's layout. Linked from the Ask panel. */
export default function AskHowItWorksPage() {
  return <ChapteredPage eyebrow="The Ask box" page={getAskPageText()} />;
}
