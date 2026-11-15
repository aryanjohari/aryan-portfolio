import type { Metadata } from "next";

import { ChapteredPage } from "@/components/ChapteredPage";
import { getProfile } from "@/lib/profile";
import { getStoryText } from "@/lib/site-text-files";

export function generateMetadata(): Metadata {
  return { title: `The long story · ${getProfile().name}`, description: getStoryText().summary };
}

/** Layout follows mockups/story.html. */
export default function StoryPage() {
  return <ChapteredPage eyebrow="The long story" page={getStoryText()} lastIsNow />;
}
