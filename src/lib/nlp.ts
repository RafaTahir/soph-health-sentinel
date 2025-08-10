import { RawPost, ProcessedPost, PostType } from "@/types/Post";

const DISEASES = ["dengue", "malaria", "covid", "chikungunya"];
const FEAR_WORDS = ["worried", "scared", "fear", "panic", "concern", "afraid"];
const NEGATIVE_SYMPTOMS = ["fever", "vomit", "nausea", "headache", "admission", "hospital", "positive"];

export function classifyPost(post: RawPost): PostType {
  // Respect provided type but allow fallback
  if (post.type) return post.type;
  const t = post.text.toLowerCase();
  if (/confirm|positive|admit|lab result/.test(t)) return "confirmed";
  if (/cure|airborne|person-to-person|vaccine available everywhere|garlic|papaya/.test(t)) return "misinformation";
  return "general";
}

export function extractEntities(text: string) {
  const t = text.toLowerCase();
  const diseases = DISEASES.filter((d) => t.includes(d));
  const locations: string[] = [];
  if (/(selangor|shah alam|petaling jaya|klang|gombak|pj|kl)/i.test(text)) {
    const m = text.match(/selangor|shah alam|petaling jaya|klang|gombak|pj|kuala lumpur/gi);
    if (m) locations.push(...Array.from(new Set(m)));
  }
  return { diseases, locations };
}

export function sentimentScore(text: string) {
  const t = text.toLowerCase();
  let score = 0;
  FEAR_WORDS.forEach((w) => { if (t.includes(w)) score -= 0.2; });
  NEGATIVE_SYMPTOMS.forEach((w) => { if (t.includes(w)) score -= 0.1; });
  // confirmations increase perceived concern
  if (/confirmed|positive|admit/.test(t)) score -= 0.2;
  // community action slightly reduces concern
  if (/clean-up|fogging|authorit|notified|prevention/.test(t)) score += 0.15;
  score = Math.max(-1, Math.min(1, score));
  const label = score < -0.5 ? "high" : score < -0.2 ? "medium" : "low";
  return { score, label } as const;
}

export function generateFactCheck(text: string): string | undefined {
  const t = text.toLowerCase();
  if (t.includes("papaya")) return "There is no scientific evidence that papaya leaf juice cures dengue. Management focuses on hydration, monitoring, and medical care.";
  if (t.includes("person-to-person") || t.includes("airborne")) return "Dengue does not spread person-to-person or through the air. It is transmitted by Aedes mosquitoes. Prevent bites and remove stagnant water.";
  if (t.includes("garlic")) return "Garlic or herbal remedies do not prevent dengue. Use proven methods: eliminate stagnant water, use repellents, and ensure community fogging when advised.";
  if (t.includes("uv lamp")) return "UV lamps are not an effective dengue control measure outdoors. Source reduction and repellents are recommended by public health authorities.";
  if (t.includes("vaccine")) return "Dengue vaccines have specific eligibility and are not universally recommended. Consult official MOH guidance and your doctor.";
  if (t.includes("hiding numbers") || t.includes("deaths higher")) return "Official case/death reporting follows MOH protocols. Always refer to the latest MOH dashboards for verified figures.";
  return undefined;
}

export function processPost(raw: RawPost): ProcessedPost {
  const category = classifyPost(raw);
  const { diseases } = extractEntities(raw.text);
  const sentiment = sentimentScore(raw.text);
  const factCheck = category === "misinformation" ? generateFactCheck(raw.text) : undefined;
  return { ...raw, category, diseases: diseases.length ? diseases : ["dengue"], sentiment, factCheck };
}
