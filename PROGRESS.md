# LCP Clima progress

On-device data stays in IndexedDB (jobs, photos, offers, settings), with Settings → Export backup. IndexedDB is used instead of localStorage so existing jobs and photos keep working.

## Done

- Install cost calculator, service calls, photos, backup, finished jobs, save button, quote VAT toggle, cost checklist, LCP logo and navy/amber theme.
- Main tabs: BTU calculator, Offers, Service, Installation.
- BTU guide for Shkodër recommends 9k/12k/18k/24k and can start an offer or an installation.
- Offers with VAT hidden by default, three editable warranty/membership packages in Settings, printable offer with LCP Clima and the phone number only.
- Service checklist can exclude visit, extra time, travel, materials or gas. Existing rates stay 4,000 / 2,000 / 30 Lek.
- Customer price for an installation is still the VAT-inclusive unit price plus the package. No markup.
- Costs show in red. Income and profit show in green.

## Done this hand-off

- Production base path is `/lcp-jobs/` so GitHub Pages at `https://lcp-clima.github.io/lcp-jobs/` can serve the PWA. Manifest `start_url` and `scope` are `/lcp-jobs/`. Built asset and service-worker URLs use that prefix. `public/.nojekyll` is included so Pages does not skip files.
- Another agent will push this to `https://github.com/LCP-CLIMA/lcp-jobs` and enable Pages. This environment could read that repo but could not push or turn Pages on.

## Next

- Publish the built site and confirm `https://lcp-clima.github.io/lcp-jobs/`, `manifest.webmanifest`, and `sw.js` return 200.
- A durable public URL still needs that GitHub Pages publish. Test links are temporary Cloudflare tunnels.
- 9k has no separate install package yet. Using 9k in an installation starts a 12k price list and says so in the notes.
- Confirm the three starter packages (Bazë, Plus, Abonim vjetor) and their prices with Natan. They can already be edited or deleted in Settings.
