# 2026-10-15 — M9 services, working arrangements and booking CTA

**Stage:** M9 active, V1 branch `feature/m8-advanced-editor` · [Draft PR #23](https://github.com/teodor-andonov/ta-website-builder-261012/pull/23).  
**Restrictions:** No merge, staging/production deployment, branch removal or screenshots. Real TA site only; demo projects remain unapproved.

## Implemented

1. Updated the actual Home Card tree in `content/site.json`: Architecture, Computation and Facades & Research descriptions; three arrangements (fixed packages, subscription and custom engagement). All wording is descriptive of *potential* engagement approaches: no invented offer prices, delivery guarantees or claims about completed project work.
2. Reused `contact-cta` in an eighth Home section, while retaining its existing reusable use in project templates. CTA proposes a **15-minute introduction**.
3. Added optional `site.contact.email` and `site.contact.bookingUrl` fields to the canonical JSON. They deliberately start empty, because no verified email or booking URL has been supplied.
4. Implemented strict HTTPS URL/email validation in `src/model.mjs`. The shared renderer binds `{{site.contact.bookingUrl}}` and renders the booking CTA **inert** when unconfigured, not an `href="#"` or an invented booking destination. When a URL exists it renders a regular safe external link. A missing booking destination appears in the M9 release content audit.
5. Added editable site-wide contact settings to the Content Studio Overview/Data inspector. Edits are validated **on a cloned candidate** before entering live memory or the existing revision-checked save queue. Invalid URL changes are rejected without destroying the previous good value.
6. Added four M9 unit tests and one real Chromium flow covering fill/validate/set/clear booking URL, rendering and safety. Updated the Home semantic section assertions from seven to eight and preserved DOM/scroll browser QA.

## Verification

- **Implementation commit:** [`bd3b6a16`](https://github.com/teodor-andonov/ta-website-builder-261012/commit/bd3b6a165671edbab22882f5d153e46c72d008e8).
- [Test/build CI](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38724343543): **success**, 92 tests, 92 passed, 0 failed. Ten static pages built.
- [Screenshot-free Chromium](https://github.com/teodor-andonov/ta-website-builder-261012/actions/runs/38724343634): **success**, including `M9_CONTACT_OK` and earlier M8 selection, keyboard, nested tree, save/import and offline recovery.
- M9 audit: **21 outstanding blockers** = 1 missing booking destination; 4 demonstration asset files; 6 existing demo covers; 7 active records not approved; 3 published pages not approved. The prior placeholder email is gone, but no new contact was invented.
- No new screenshots captured or output. Content source, renderer and local Studio remain a single JSON-based workflow.

## Next safe implementation steps

- Improve record/project intake and image metadata for the actual TA portfolio, including meaningful captions, credits and selected images, without fabricating completed-project evidence or a media license.
- Obtain real project and post drafts, approved text/media, contact email and booking link; mark publication approval only after review.
- Expand real Home/Work/Journal content as approved. Do not create a second demo site or perform a production release while audit issues remain.
- Keep all M8–M11 work on PR #23; preserve the branch. Only one final V1 squash merge is authorised when all M9/M10/M11 acceptance gates pass.
