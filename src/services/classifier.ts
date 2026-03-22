import type { AggregatedNote, NoteTopicMap, TopicGroup, AIConfig } from '../types';
import { aiService } from './ai';

const BATCH_SIZE = 30;

export async function classifyNotes(
  notes: AggregatedNote[],
  config: AIConfig,
  onProgress?: (done: number, total: number) => void
): Promise<NoteTopicMap[]> {
  const results: NoteTopicMap[] = [];
  let done = 0;

  for (let i = 0; i < notes.length; i += BATCH_SIZE) {
    const batch = notes.slice(i, i + BATCH_SIZE);

    const prompt = `You are a note categorization assistant. Assign each note a short topic label (1-3 words, in the same language as the note title).

Notes:
${batch.map(n => `[${n.id}] "${n.title}"`).join('\n')}

Respond ONLY with a JSON object mapping note IDs to topic strings.
Example: {"id1": "Programming", "id2": "Cooking", "id3": "Programming"}`;

    try {
      let response = '';
      await aiService.chat(
        [{ role: 'user', content: prompt }],
        { ...config, temperature: 0.2 },
        (chunk) => { response += chunk; }
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed: Record<string, string> = JSON.parse(jsonMatch[0]);
        for (const note of batch) {
          const topic = parsed[note.id] || 'Other';
          results.push({ noteId: note.id, instanceId: note.instanceId, topic });
        }
      } else {
        // Fallback: assign "Other" to all in batch
        for (const note of batch) {
          results.push({ noteId: note.id, instanceId: note.instanceId, topic: 'Other' });
        }
      }
    } catch {
      for (const note of batch) {
        results.push({ noteId: note.id, instanceId: note.instanceId, topic: 'Other' });
      }
    }

    done += batch.length;
    onProgress?.(done, notes.length);
  }

  return results;
}

export function groupByTopics(notes: AggregatedNote[], topicMaps: NoteTopicMap[]): TopicGroup[] {
  const mapIndex = new Map<string, string>();
  for (const tm of topicMaps) {
    mapIndex.set(`${tm.instanceId}:${tm.noteId}`, tm.topic);
  }

  const groups = new Map<string, AggregatedNote[]>();
  for (const note of notes) {
    const topic = mapIndex.get(`${note.instanceId}:${note.id}`) || 'Other';
    if (!groups.has(topic)) groups.set(topic, []);
    groups.get(topic)!.push(note);
  }

  return Array.from(groups.entries())
    .map(([topic, topicNotes]) => ({ topic, notes: topicNotes }))
    .sort((a, b) => b.notes.length - a.notes.length);
}

export function reclassifyNote(
  noteId: string,
  instanceId: string,
  newTopic: string,
  topicMaps: NoteTopicMap[]
): NoteTopicMap[] {
  const key = `${instanceId}:${noteId}`;
  const existing = topicMaps.find(tm => `${tm.instanceId}:${tm.noteId}` === key);
  if (existing) {
    return topicMaps.map(tm =>
      `${tm.instanceId}:${tm.noteId}` === key ? { ...tm, topic: newTopic } : tm
    );
  }
  return [...topicMaps, { noteId, instanceId, topic: newTopic }];
}
