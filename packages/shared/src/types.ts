export interface VeritasScores {
  D: number;
  A: number | null;
  drs: number;
  flags: string[];
}

export interface Claim {
  text: string;
  kind: "verifiable" | "opinion";
}

export interface MarketSummary {
  id: string;
  kind: "Exclusive" | "Auction";
  status: string;
  category: number;
  submitEnd: number;
  auctionEnd: number;
  outcomeEnd: number;
}

export interface SignalOption {
  index: number;
  teamRef: string;
  score: number;
  nScouts: number;
  tierDist: [number, number, number];
  summary?: { pros: string[]; cons: string[] };
  claims: (Claim & { id: string })[];
  reasons: { filteredText: string; D: number; A: number | null; flags: string[] }[];
}
