import { ViewTransition } from "react";

/**
 * Gives a project's picture the same name on the home page and on its own page,
 * so the browser can morph one into the other when you click through.
 * Browsers without the View Transitions API just navigate as normal.
 */
export function SharedPicture({ slug, children }: { slug: string; children: React.ReactNode }) {
  return <ViewTransition name={`picture-${slug}`}>{children}</ViewTransition>;
}
