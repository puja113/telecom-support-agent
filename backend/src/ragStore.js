import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const faqs = JSON.parse(
  readFileSync(path.join(__dirname, "..", "data", "faqs.json"), "utf-8")
);

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "to", "of", "in", "on", "for",
  "and", "or", "it", "this", "that", "my", "your", "you", "i", "how", "do",
  "does", "why", "what", "can", "with", "be", "if", "not", "as", "at", "me"
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

function termFreqVector(tokens) {
  const vec = {};
  for (const t of tokens) vec[t] = (vec[t] || 0) + 1;
  return vec;
}

function cosineSim(vecA, vecB) {
  let dot = 0, magA = 0, magB = 0;
  for (const key in vecA) {
    dot += (vecA[key] || 0) * (vecB[key] || 0);
    magA += vecA[key] ** 2;
  }
  for (const key in vecB) magB += vecB[key] ** 2;
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const docVectors = faqs.map((doc) => ({
  ...doc,
  vector: termFreqVector(tokenize(`${doc.title} ${doc.content}`)),
}));

export function searchKnowledgeBase(query, k = 2) {
  const queryVec = termFreqVector(tokenize(query));
  const scored = docVectors
    .map((doc) => ({ doc, score: cosineSim(queryVec, doc.vector) }))
    .sort((a, b) => b.score - a.score);

  return scored
    .filter((s) => s.score > 0)
    .slice(0, k)
    .map((s) => ({
      id: s.doc.id,
      title: s.doc.title,
      content: s.doc.content,
      score: Number(s.score.toFixed(3)),
    }));
}
