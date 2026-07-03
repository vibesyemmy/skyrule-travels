# Skyrule Travels — Web & Archive Research Findings

*Researched 2026-07-03 via web search + Wayback Machine (web.archive.org). Basis for structuring the new site's content.*

## The company

**Skyrule Travels** is a travel agency in Lagos, Nigeria (Lekki Phase 1), ~4 employees. The business is alive on social media (LinkedIn post Dec 2024) even though the website died.

- Instagram: [@skyruletravels](https://www.instagram.com/skyruletravels/) — bio: "TRAVEL AGENCY IN LAGOS"
- LinkedIn: [Skyrule Travels](https://ng.linkedin.com/company/skyruletravels)
- Facebook: [skyruletravels](https://www.facebook.com/skyruletravels/) · X: [@skyrule_travels](https://x.com/skyrule_travels) · Pinterest: [skyruletravels](https://www.pinterest.com/skyruletravels/)

**Positioning copy from their profiles** (usable as voice reference):
> "Amazing and affordable travel packages, planning trips from start to finish, including flights booking, hotel booking and pick-up. We cover all aspects of travel, from local to international trips, business or pleasure trips."

> "Travel enriches the mind, body, and soul… unparalleled service and personalized attention… from corporate travel management to leisure travel planning."

## The old website (skyruletravels.com)

**Timeline:** built 2017 (WordPress blog + custom booking landing) → hosting suspended 2019 → same 2017 site visible again 2021 → bot-wall/parked 2024 → empty by Dec 2025. The domain is currently dead weight; the archive is the only source.

### Homepage (2017, unchanged through 2021) — [snapshot](https://web.archive.org/web/20170429055617/http://skyruletravels.com/)

A booking-first landing page with three tabbed forms + one search block:

1. **Hotels** — destination, check-in/check-out, rooms (1–3+), guests, name/email/phone → "Submit booking"
2. **Flights** — Round Trip / One Way sub-tabs: from, to, departing(/returning), passengers, name/email/phone → "Submit booking"
3. **Visa Application** — name/email/phone → "Submit Application"
4. **Search for Activities** — destination + date range

Notably: the forms are lead-capture (name/phone/email → agency follows up), NOT a live booking engine. That's the actual business model — personal-service brokering.

### Destination & trust imagery on the old site

Asset names reveal the promoted destinations: **Berlin, Budapest, Crete, Dubai, London, New York, Paris, Rome, Santorini** — plus country flags (UAE, Germany, Greece, Hungary, US, South Africa) and **IATA + ITP accreditation badges**.

### About page (2018) — [snapshot](https://web.archive.org/web/20180822044516/http://skyruletravels.com/blog/about/)

Thin: headline "We're a Travel Agency." + two stock photos. The new site needs real about copy; the social-profile positioning above is the best seed.

### Contact page (2018) — [snapshot](https://web.archive.org/web/20180822043458/http://skyruletravels.com/blog/contact/)

- **Visit:** No 1 Victoria Arobieke Street, off Admiralty Way, Lekki Phase 1, Lagos
- **Mail:** enquiries@skyruletravels.com
- **Call:** 0815 601 0101, 0815 701 0101
- Form: name, email, subject, message

⚠️ These details are from 2017–2018 — **verify current address/phones with the client before publishing.**

### Blog (2017–2019) — [snapshot](https://web.archive.org/web/20190308220234/http://skyruletravels.com/blog/blog/)

"The daily Post" — real travel-content marketing with named authors:
- "Top 5 Best Foods to Eat in Italy" (Naomi James, Food)
- "Top 5 Hidden Tourist Sites In The World" (Oluwalayomi Udemagwuna, Lifestyle — Plitvice Lakes feature)

## Mapping old content → new site skeleton

The current Astro pages map naturally onto the recovered structure:

| Current page | Proposed content (from archive) |
|---|---|
| `index.astro` (home) | Hero: travel imagery + positioning line; service cards (the product-card pattern) → Flights / Hotels / Visa / Pick-up; "how it works" (the process-section pattern) → enquire → we plan → you fly; destinations strip (Dubai, London, Paris, Santorini…); contact CTA |
| `products.astro` | **Services** (rename): Flights (round trip/one way), Hotel booking, Visa assistance, Airport pick-up, Corporate travel management, Leisure packages |
| `about.astro` | Real about copy seeded from the positioning quotes; Lagos story; IATA/accreditation trust badges; team (they had named staff) |
| `contact.astro` | Recovered address/email/phones (after verification) + enquiry form (the benchmark contact-form pattern exists) |
| `configurator.astro` | Repurpose as **"Plan your trip"** — a lead-capture enquiry flow (destination, dates, travellers, contact), the modern version of the 2017 tabbed booking forms |
| `find-a-fitter.astro` | Repurpose as **Destinations** (grid of destination cards) — or retire |
| (new, later) | Blog — they had genuine content marketing; the old posts could even be republished |

## Open questions for the client

1. Are the Lekki address and 0815 numbers still current?
2. Which destinations/markets matter now (2017 list was Europe/US/UAE/SA-heavy)?
3. Do the booking forms stay lead-capture (email follow-up) or integrate anything live?
4. Should the old blog posts be revived?
