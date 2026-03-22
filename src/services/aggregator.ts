import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { JoplinConfig, JoplinNote, JoplinNotebook, JoplinTag, JoplinInstance, AggregatedNote } from '../types';

class InstanceClient {
  private client: AxiosInstance;

  constructor(config: JoplinConfig) {
    this.client = axios.create({
      baseURL: `http://${config.host}:${config.port}`,
      params: { token: config.token },
      timeout: 15000,
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.get('/ping');
      return true;
    } catch {
      return false;
    }
  }

  async getAllNotes(): Promise<JoplinNote[]> {
    const notes: JoplinNote[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data } = await this.client.get('/notes', {
        params: {
          page,
          limit: 100,
          order_by: 'updated_time',
          order_dir: 'DESC',
          fields: 'id,title,body,created_time,updated_time,parent_id,is_todo,todo_completed',
        },
      });
      notes.push(...(data.items || []));
      hasMore = data.has_more;
      page++;
    }

    return notes;
  }

  async getNotebooks(): Promise<JoplinNotebook[]> {
    const { data } = await this.client.get('/folders', {
      params: { fields: 'id,title,parent_id,created_time,updated_time' },
    });
    return data.items || [];
  }

  async getTags(): Promise<JoplinTag[]> {
    const { data } = await this.client.get('/tags', {
      params: { fields: 'id,title', limit: 200 },
    });
    return data.items || [];
  }

  async createNotebook(title: string, parentId?: string): Promise<JoplinNotebook> {
    const { data } = await this.client.post('/folders', {
      title,
      parent_id: parentId || '',
    });
    return data;
  }

  async createNote(note: Partial<JoplinNote>): Promise<JoplinNote> {
    const { data } = await this.client.post('/notes', note);
    return data;
  }

  async deleteNote(id: string): Promise<void> {
    await this.client.delete(`/notes/${id}`);
  }

  async updateNote(id: string, changes: Partial<JoplinNote>): Promise<JoplinNote> {
    const { data } = await this.client.put(`/notes/${id}`, changes);
    return data;
  }
}

class AggregatorService {
  private clients: Map<string, InstanceClient> = new Map();

  connect(instance: JoplinInstance): void {
    const client = new InstanceClient(instance.config);
    this.clients.set(instance.id, client);
  }

  disconnect(instanceId: string): void {
    this.clients.delete(instanceId);
  }

  async pingInstance(instanceId: string): Promise<boolean> {
    const client = this.clients.get(instanceId);
    if (!client) return false;
    return client.ping();
  }

  async aggregateAllNotes(instances: JoplinInstance[]): Promise<AggregatedNote[]> {
    const results: AggregatedNote[] = [];

    await Promise.allSettled(
      instances
        .filter(inst => inst.isConnected)
        .map(async (inst) => {
          const client = this.clients.get(inst.id);
          if (!client) return;
          const notes = await client.getAllNotes();
          const annotated: AggregatedNote[] = notes.map(n => ({
            ...n,
            instanceId: inst.id,
            instanceName: inst.name,
          }));
          results.push(...annotated);
        })
    );

    return results;
  }

  async getNotebooksForInstance(instanceId: string): Promise<JoplinNotebook[]> {
    const client = this.clients.get(instanceId);
    if (!client) return [];
    return client.getNotebooks();
  }

  async getTagsForInstance(instanceId: string): Promise<JoplinTag[]> {
    const client = this.clients.get(instanceId);
    if (!client) return [];
    return client.getTags();
  }

  async createNotebookInInstance(instanceId: string, title: string, parentId?: string): Promise<JoplinNotebook | null> {
    const client = this.clients.get(instanceId);
    if (!client) return null;
    return client.createNotebook(title, parentId);
  }

  async copyNoteToInstance(instanceId: string, note: AggregatedNote, notebookId: string): Promise<JoplinNote | null> {
    const client = this.clients.get(instanceId);
    if (!client) return null;
    return client.createNote({
      title: note.title,
      body: note.body,
      parent_id: notebookId,
      is_todo: note.is_todo,
    });
  }

  async deleteNoteFromInstance(instanceId: string, noteId: string): Promise<void> {
    const client = this.clients.get(instanceId);
    if (!client) return;
    return client.deleteNote(noteId);
  }
}

export const aggregatorService = new AggregatorService();
