/**
 * metals.live API — free, no API key needed
 * Gold: https://api.metals.live/v1/spot/gold
 * Silver: https://api.metals.live/v1/spot/silver
 * Response format: [{"gold": 4988.12, ...}] or [{"silver": 32.45, ...}]
 */

export async function fetchMetalsLivePrice(
  pair: "XAU/USD" | "XAG/USD",
): Promise<number> {
  const metal = pair === "XAU/USD" ? "gold" : "silver";
  const url = `https://api.metals.live/v1/spot/${metal}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    // Response is an array: [{"gold": 4988.12}]
    const price = Number(json[0]?.[metal] ?? 0);
    if (price > 0) return price;
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Poll metals.live every intervalMs milliseconds.
 * Returns a cleanup function to stop polling.
 */
export function startMetalsPolling(
  pair: "XAU/USD" | "XAG/USD",
  onPrice: (price: number) => void,
  intervalMs = 5000,
): () => void {
  let active = true;
  const poll = async () => {
    if (!active) return;
    const price = await fetchMetalsLivePrice(pair);
    if (active && price > 0) onPrice(price);
  };
  poll();
  const timer = setInterval(poll, intervalMs);
  return () => {
    active = false;
    clearInterval(timer);
  };
}
