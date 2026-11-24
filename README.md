# LCP Clima

Job book for L.C.P CLIMA (NUIS M67103002U), Shkodër. Installation jobs keep a full cost and profit calculation. Service calls keep the visit, the WhatsApp pre-check, and the repair price.

Everything stays on the phone (IndexedDB). There is no account and no server database.

## Run locally

```bash
npm install
npm test
npm run dev
```

The dev server listens on port 47321. A production build is `npm run build`; the files are in `dist/`.

## Install on iPhone

1. Open the site in Safari (the address must be https).
2. Tap Share.
3. Tap Add to Home Screen.
4. Open LCP Clima from the new icon.

It runs offline after the first load. iPhone can erase data for an app that is not opened for a long time. Use Settings → Export backup and keep the zip somewhere else.

## Service prices

New service calls start from these rates. Change them in Settings; jobs already saved keep their own copy.

- First visit (Vizita e parë) 3,000 Lek, VAT included: one hour general check-up. Then 2,000 Lek for each started 30 minutes, and 30 Lek per kilometre of the round trip beyond 15 km one way.
- 2,000 Lek for each started 30 minutes after the first hour.
- 30 Lek per kilometre of the round trip beyond that 15 km one-way zone.
- The WhatsApp pre-check is free.
- If the customer accepts the repair, the visit fee is taken off the total and they pay the repair price plus materials and gas. If they decline, they pay only the visit.

## Install prices

A new installation starts from the saved price list (labor 10,000 / 12,000 / 13,000 Lek, packages 20,500 / 22,500 / 23,500, pipes, both cables, trunking at 700 Lek/m with a 3 m minimum, and the van cost). The Hitachi example on a fresh phone is the check case: about −4,834 Lek, with break-even packages 26,301 / 29,166 / 31,596.
