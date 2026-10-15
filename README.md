# JalSaakshya · জল সাক্ষ্য · जल साक्ष्य

**Official groundwater arsenic and fluoride readings for West Bengal villages, each cited to its government report page, published on [Arkiv](https://arkiv.network) and read straight from it.**

**Live app:** https://mohitt31.github.io/jalsaakshya/ · Built for *Arkiv: Global Tour Stop* (9 to 18 October 2026), track **Best Indian Use Case**.

## The problem

West Bengal has some of the world's worst groundwater arsenic, and Purulia, Bankura and Birbhum have high fluoride. The government does measure it: the Central Ground Water Board (CGWB) publishes the numbers. But they sit in annexure tables on page 100+ of 200-page PDFs, the links break when websites are reorganised (one of the reports used here already lives under `cgwb.gov.in/old_website/`), and nobody outside a lab can tell whether a number they were forwarded on WhatsApp really came from that report.

People who need these numbers in their work: PHED and block-level field staff deciding which tube wells to test first, NGO arsenic-mitigation workers, gram panchayat members asking for a piped-water connection, school teachers, and local journalists.

## What it does

- Pick a district, optionally a contaminant, "only above the limit", a sampling year and a village prefix. You get each measured value, converted to mg/L, compared with the IS 10500 limit, with the report title, a link to the exact PDF page and the table row as printed.
- Every official record is an Arkiv entity created by one curator wallet. The app shows a record only if its on-chain `$creator` is that wallet, so a copy written by someone else is not shown as official. The records are read-only: not even the curator can edit them silently.
- Community field tests: anyone can add a kit or lab reading. It is labelled with its author's wallet and "not verified", and it fades after 90 days unless someone re-tests and confirms it, which extends it by another 90 days. New reports appear live over a WebSocket subscription.
- English, हिन्दी and বাংলা labels. Works on a phone. There is no server: close our site and the same data is still queryable from Arkiv with the documented [data contract](arkiv/schema.md).

## Why Arkiv

| Need | What breaks elsewhere | What Arkiv gives |
|---|---|---|
| Proof that a number came from the curated dataset | In Postgres or our own API, whoever runs the server can change a row and nobody can tell | `$creator` is immutable and the entities are `readonly`; the app filters with `createdBy(curator)` |
| The data must outlive this website | A dead site or a moved PDF link takes the evidence with it | Anyone can query `app = "jalsaakshya/v1"` from any client; no backend, no API key |
| Community reports must age out | A database keeps stale "safe" readings forever unless someone writes a cleanup job | Entity Expiration (90 days) plus permissionless Lifetime Extension: a report lives only while people confirm it |
| Query by place, contaminant and value | IPFS or a blob store needs a separate index | Typed attributes with numeric ranges (`mgl > 1.5`, `year >= 2015`) and `startsWith` on place |

What stays off Arkiv on purpose: the PDFs themselves (only URL, page and row text go on chain), the table extraction pipeline, and anything personal.

## How the data was built

The rows come from [NeerTathya](https://github.com/mohitt31/jaldrishti) (same author, built for an earlier hackathon), which found the reports with SerpApi, read the tables and re-found every number on its PDF page. JalSaakshya reuses its published evidence snapshot (`data/source/neertathya-evidence.json.gz`, commit `b43d03f`) and keeps only page-verified concentration rows with a district and a unit printed on the cited page: **1,173 records from 13 documents across 21 districts**. Rows whose unit is not printed on the page (1,386) are dropped, not guessed.

```bash
python3 scripts/build_records.py      # -> web/public/data/records.json (the curator's publish input)
```

## Run it

```bash
cd web && npm install
npm run dev          # http://localhost:5173/jalsaakshya/
npm run build        # static site in ../dist
../scripts/deploy.sh # publish dist to the gh-pages branch
```

The curator console (`/curator.html`) generates a signing key in the browser, shows its address, and publishes the dataset in atomic batches. It skips rows that are already on Arkiv, so it can resume.

## Reproduce the Arkiv usage

See [arkiv/schema.md](arkiv/schema.md) for every entity type and query, and the "How can judges reproduce" steps in [SUBMISSION.md](SUBMISSION.md).

## Limits

- Research evidence, not household safety advice. A survey value describes one place and time; test your own water at an accredited lab.
- The dataset is what NeerTathya's library held: it is not every report ever published for West Bengal.
- Field tests are not verified by anyone; the app says so on every card.
- Tiramisu is a testnet.

## Licence

MIT. Source reports are public documents of the Government of India (CGWB) and published abstracts; their links are kept with every record.
