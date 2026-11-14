/**
 * Checks every content file before a build (docs/V2_PLAN.md §15):
 * - a phone number never ships, in any build;
 * - TODO text (wording Aryan hasn't edited yet) is a warning locally and an
 *   error in a production deploy.
 * Pure: the caller reads the files.
 */

export type ContentFile = { path: string; text: string };

const PHONE_PATTERNS = [
  /\+\d{1,3}[\s-]?\d{1,4}[\s-]?\d{3,4}[\s-]?\d{3,4}/, // international, e.g. +64 21 123 4567
  /\b0[2-9]\d?[\s-]?\d{3}[\s-]?\d{3,4}\b/, // NZ mobile or landline, e.g. 021 123 4567, 09 123 4567
];

export function checkContent(
  files: ContentFile[],
  { production }: { production: boolean },
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    file.text.split("\n").forEach((line, index) => {
      const at = `${file.path}:${index + 1}`;
      if (PHONE_PATTERNS.some((pattern) => pattern.test(line))) {
        // The number itself is left out of the message so logs don't repeat it.
        errors.push(`${at}: looks like a phone number; phone numbers never go on the site`);
      }
      if (line.includes("TODO")) {
        (production ? errors : warnings).push(`${at}: TODO text not yet edited`);
      }
    });
  }

  return { errors, warnings };
}
