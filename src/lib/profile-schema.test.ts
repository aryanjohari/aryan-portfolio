import assert from "node:assert/strict";
import { test } from "node:test";

import { validateProfile } from "./profile-schema";

function validProfile() {
  return {
    name: "Aryan Johari",
    headline: "Junior Software Developer",
    tagline: "Builds careful, tested tools.",
    pitch: "Short pitch.",
    location: "Auckland, New Zealand",
    work_rights: "Post Study Work Visa to Aug 2029",
    links: {
      email: "someone@example.com",
      github: "https://github.com/aryanjohari",
      linkedin: "https://www.linkedin.com/in/example/",
      cv: "/cv",
    },
    threads: [
      { id: "web", name: "Web products", stack: "TypeScript, React" },
      { id: "ai", name: "Safe AI tools", stack: "Python" },
    ],
    experience: [
      {
        role: "Full Stack Developer (volunteer)",
        org: "9horsemen",
        dates: "Oct 2026 – present",
        highlights: ["Built the admin app's AI assistant."],
      },
    ],
    education: [{ degree: "BSc Computer Science", school: "Thakur College, Mumbai", dates: "Sep 2021 – Apr 2024" }],
    certifications: ["AWS Certified Developer – Associate"],
    referees: "Available on request",
  };
}

test("accepts a complete profile, including an open-ended 'present' date", () => {
  const result = validateProfile(validProfile());
  assert.equal(result.ok, true);
});

test("rejects a profile with a missing required field and names the field", () => {
  const profile: Partial<ReturnType<typeof validProfile>> = validProfile();
  delete profile.headline;
  const result = validateProfile(profile);
  assert.deepEqual(result, { ok: false, message: "Missing or empty required field: headline" });
});

test("rejects a date range written with a hyphen instead of an en dash", () => {
  const profile = validProfile();
  profile.experience[0].dates = "Oct 2026 - present";
  const result = validateProfile(profile);
  assert.equal(result.ok, false);
  assert.match(!result.ok ? result.message : "", /^experience\[0\]\.dates must look like/);
});

test("rejects two threads with the same id, since projects reference threads by id", () => {
  const profile = validProfile();
  profile.threads[1].id = "web";
  const result = validateProfile(profile);
  assert.deepEqual(result, { ok: false, message: 'threads[1].id "web" is used twice' });
});
