# LCP Clima progress

On-device data stays in IndexedDB (jobs, photos, offers, settings), with Settings → Export backup. IndexedDB is used instead of localStorage so existing jobs and photos keep working. New fields are optional. Older jobs load through `normalizeJob` / `normalizeSettings` / `normalizeOffer`.

## Done

- Install cost calculator, service calls, photos, backup, finished jobs, save button, quote VAT toggle, cost checklist, LCP logo and navy/amber theme.
- Main tabs sit at the top: BTU, Offers (oferta), Service (servis), Install (montim), Fitim / Humbje.
- Fitim / Humbje lists every installation and service job by date, with profit in green, loss in red, and a running total.
- BTU guide for Shkodër recommends 9k/12k/18k/24k and can start an offer or an installation. The BTU tab itself is unchanged.
- Offers: choosing a size renames the item to `Kondicioner Inverter … BTU` and sets Kosto pune (9k and 12k 20,500, 18k 22,500, 24k 23,500 Lek, from the saved package prices). Garanci shtesë is 25,000 Lek per year and includes abonim vjetor for that year. Every install includes 1 year of abonim vjetor free; further years are 6,000 Lek and are not charged when the free year or the extra warranty already covers them. Vinç/Lift is 10,000 Lek per hour. Tullë is free; Mur guri and Beton are 13,000 Lek per gropë. Tub shtesë shows 3 m included and uses the existing extra-pipe price (1,500 Lek/m). Pa ashensor adds the per-floor placeholder. Print, Share, copy, and WhatsApp use the same LCP Clima sheet and the TVSH toggle.
- Each offer line has **Shfaq te klienti**, on by default and saved with the offer. Unchecked lines stay in the total and drop off the customer print, share, copy and WhatsApp text. If every line is hidden, the customer sees one total.
- Install and Service lists filter only by Ofertë, E planifikuar, Në proces, and Përfunduar dhe paguar. Both kinds use those four statuses. Saved Done and Paid read as the last one.
- Service jobs have repair option lines. Prices you did not have stay 0 and are marked “Duhet një vlerë”. Vizita e parë for new jobs is 3,000 Lek (one hour). A saved job keeps its own call-out. Settings still on the old 4,000 default move to 3,000 once. After the first hour, 2,000 Lek / 30 min and 30 Lek/km beyond 15 km are unchanged.
- Customer price for an installation is still the VAT-inclusive unit price plus the package. No markup.
- Costs show in red. Income and profit show in green.

## Placeholders (need a real value)

- Pa ashensor: 1,000 Lek per floor above ground. Editable in Settings. Marked as a placeholder.
- Repair option prices, all editable and currently 0: Kondensator motorri, Kondensator ventilatori, Mbushje me gaz, Test presioni me azot, Gjetje, riparim dhe saldim rrjedhjesh në tuba, Kontroll elektrik, Kontroll drenazhi, Kontroll performance.
- Tub shtesë uses the existing extra-pipe rate of 1,500 Lek/m. If that rate is cleared, the offer says a value is needed. It does not invent a new price.

## Publish

- Service jobs have Kontroll Sistemi / Ngarkesa. Readings stay on the job. Temperatures are °C only. Diagnosis is guidance; the nameplate wins. Importo raport Fieldpiece reads a Job Link PDF or photo on the phone and asks the tech to confirm each value. The label map is in `src/lib/fieldpiece.ts`.
- Four tabs, with no shared figures: BTU, Offer (customer quote), Service & installation (buy price, materials, extras, and the selling price you type), Profit & loss (saved jobs for one month). Profit is selling price minus those costs only. The service worker cache id is `lcp-jobs-v4`.
- GitHub Pages: https://lcp-clima.github.io/lcp-jobs/

## Next

- Confirm the no-elevator per-floor price and the repair-option prices with Natan.
- 9k has no separate install package in the cost calculator. An installation started from 9k still uses the 12k price list and says so. On an offer, 9k labour is 20,500 Lek, the same as 12k.
