import type { APIRoute } from "astro";
import { promoStore } from "../../../lib/promos/store";
import { activeFor } from "../../../lib/promos/resolve";
import { PLACEMENTS } from "../../../lib/promos/schema";

export const prerender = false;

export const GET: APIRoute = async () => {
  const now = new Date();
  const { promos } = await promoStore.read();

  const active = Object.fromEntries(
    PLACEMENTS.map((placement) => [placement, activeFor(promos, placement, now)]),
  );

  return new Response(JSON.stringify(active), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Matches the homepage cache window, so a scheduled promo appears at the
      // same time on every page rather than at two different moments.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
};
