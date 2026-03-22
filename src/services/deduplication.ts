import type { AggregatedNote, DuplicateGroup, DuplicateMethod } from '../types';
import type { AIConfig } from '../types';
import { aiService } from './ai';

// Simple hash function (djb2) — no crypto API needed
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // convert to unsigned 32-bit
  }
  return hash.toString(16);
}

function normalizeBody(body: string): string {
  return body.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/[^\w\s]/g, '');
}

// Levenshtein distance for fuzzy title matching
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

export function findByHash(notes: AggregatedNote[]): DuplicateGroup[] {
  const groups = new Map<string, AggregatedNote[]>();

  for (const note of notes) {
    const hash = hashString(normalizeBody(note.body));
    if (!groups.has(hash)) groups.set(hash, []);
    groups.get(hash)!.push(note);
  }

  const result: DuplicateGroup[] = [];
  let idx = 0;
  for (const [, group] of groups) {
    if (group.length > 1) {
      result.push({ id: `hash-${idx++}`, method: 'hash' as DuplicateMethod, notes: group, similarity: 1 });
    }
  }
  return result;
}

export function findByTitle(notes: AggregatedNote[], threshold = 0.85): DuplicateGroup[] {
  const used = new Set<string>();
  const groups: DuplicateGroup[] = [];
  let idx = 0;

  for (let i = 0; i < notes.length; i++) {
    if (used.has(notes[i].id)) continue;
    const group: AggregatedNote[] = [notes[i]];
    let minSim = 1;

    for (let j = i + 1; j < notes.length; j++) {
      if (used.has(notes[j].id)) continue;
      const sim = titleSimilarity(notes[i].title, notes[j].title);
      if (sim >= threshold) {
        group.push(notes[j]);
        used.add(notes[j].id);
        minSim = Math.min(minSim, sim);
      }
    }

    if (group.length > 1) {
      used.add(notes[i].id);
      groups.push({ id: `title-${idx++}`, method: 'title' as DuplicateMethod, notes: group, similarity: minSim });
    }
  }

  return groups;
}

export async function findByAI(
  notes: AggregatedNote[],
  config: AIConfig,
  onProgress?: (done: number, total: number) => void
): Promise<DuplicateGroup[]> {
  // Send batches of 10 note pairs to AI and ask which are duplicates
  // For large lists we take title+first 200 chars as context
  const summaries = notes.map(n => ({
    id: n.id,
    title: n.title,
    preview: n.body.substring(0, 200),
  }));

  const batchSize = 20;
  const groups: DuplicateGroup[] = [];
  let idx = 0;
  let done = 0;

  for (let i = 0; i < summaries.length; i += batchSize) {
    const batch = summaries.slice(i, i + batchSize);
    const prompt = `You are a duplicate note detector. Given this list of notes (id, title, preview), identify groups of semantic duplicates — notes that cover the same topic or content.

Notes:
${batch.map(n => `[${n.id}] "${n.title}": ${n.preview}`).join('\n')}

Respond ONLY with a JSON array of duplicate groups. Each group is an array of note IDs. Only include groups with 2+ notes. If no duplicates found, return [].
Example: [["id1","id2"],["id3","id4","id5"]]`;

    try {
      let response = '';
      await aiService.chat(
        [{ role: 'user', content: prompt }],
        { ...config, temperature: 0.1 },
        (chunk) => { response += chunk; }
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed: string[][] = JSON.parse(jsonMatch[0]);
        for (const idGroup of parsed) {
          const groupNotes = idGroup
            .map(id => notes.find(n => n.id === id))
            .filter(Boolean) as AggregatedNote[];
          if (groupNotes.length > 1) {
            groups.push({ id: `ai-${idx++}`, method: 'ai' as DuplicateMethod, notes: groupNotes });
          }
        }
      }
    } catch {
      // skip failed batch
    }

    done += batch.length;
    onProgress?.(done, summaries.length);
  }

  return groups;
}

export function deduplicateGroups(groups: DuplicateGroup[]): DuplicateGroup[] {
  // Merge groups that share notes (transitive closure)
  const noteToGroup = new Map<string, number>();
  const merged: DuplicateGroup[] = [];

  for (const group of groups) {
    const existingIdxSet = new Set<number>();
    for (const note of group.notes) {
      const existing = noteToGroup.get(`${note.instanceId}:${note.id}`);
      if (existing !== undefined) existingIdxSet.add(existing);
    }

    if (existingIdxSet.size === 0) {
      const newIdx = merged.length;
      merged.push({ ...group });
      for (const note of group.notes) {
        noteToGroup.set(`${note.instanceId}:${note.id}`, newIdx);
      }
    } else {
      // Merge into first existing group
      const targetIdx = [...existingIdxSet][0];
      const existing = merged[targetIdx];
      const existingIds = new Set(existing.notes.map(n => `${n.instanceId}:${n.id}`));
      for (const note of group.notes) {
        const key = `${note.instanceId}:${note.id}`;
        if (!existingIds.has(key)) {
          existing.notes.push(note);
          existingIds.add(key);
          noteToGroup.set(key, targetIdx);
        }
      }
    }
  }

  return merged;
}
