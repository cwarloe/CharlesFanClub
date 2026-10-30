# Charles Fan Club Poll

A single-page poll site ("Vote for Two Candidates") built as one static file, `index.html`. Visitors enter their name, pick exactly two candidates, submit, and can view live results.

**Live site:** https://cwarloe.github.io/CharlesFanClub/

Hosted on GitHub Pages from the `main` branch.

## How the backend works

There is no server in this repo. Votes are stored through a Google Apps Script web app (backed by a Google Sheet):

- `GOOGLE_SCRIPT_URL` in `index.html` points at the deployed Apps Script web app.
- **Submit vote:** `POST` with JSON `{ action: 'vote', voterName, candidates: [a, b] }`. The request uses `mode: 'no-cors'`, so the browser cannot read the response; the page treats "no network error" as success.
- **Load results:** `GET <GOOGLE_SCRIPT_URL>?action=results`, expected to return JSON like `{ "results": { "Laeith": 3, "Hudson": 1 } }`.
- Results are rendered with `textContent` (no raw HTML from the server), and an empty or missing `results` shows "No votes yet".

### Duplicate-vote protection

After a successful submit the page stores a flag and the voter name in `localStorage`. On later visits the form is disabled and shows "You've already voted", while results remain viewable. This is a convenience only, not real enforcement: clearing storage, using another browser, or calling the backend directly bypasses it. Real enforcement would have to live in the Apps Script.

## Known open items

- [ ] `GOOGLE_SCRIPT_URL` ends in `/dev`, the owner-only test deployment. Other people can only vote once the public deployment URL (ending in `/exec`) is used instead.
- [ ] Profile image is still the `YOUR_IMAGE_URL_HERE` placeholder. Add an image (e.g. `images/profile.png`) and update the `<img src>`.
- [ ] The Apps Script source (`google-script.js`) is not in the repo and should be committed.
- [ ] Server-side duplicate-vote enforcement (see above).
