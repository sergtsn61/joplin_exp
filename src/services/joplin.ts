import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { JoplinConfig, JoplinNote, JoplinNotebook, JoplinTag, JoplinRevision, JoplinResource } from '../types';

class JoplinService {
  private client: AxiosInstance | null = null;
  private config: JoplinConfig | null = null;

  connect(config: JoplinConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `http://${config.host}:${config.port}`,
      params: { token: config.token },
      timeout: 10000,
    });
  }

  private ensureConnected() {
    if (!this.client) {
      throw new Error('Joplin not connected. Please configure the connection first.');
    }
  }

  async ping(): Promise<boolean> {
    try {
      this.ensureConnected();
      await this.client!.get('/ping');
      return true;
    } catch {
      return false;
    }
  }

  // Notes
  async getNotes(page = 1, limit = 50): Promise<{ items: JoplinNote[]; has_more: boolean }> {
    this.ensureConnected();
    const { data } = await this.client!.get('/notes', {
      params: {
        page,
        limit,
        order_by: 'updated_time',
        order_dir: 'DESC',
        fields: 'id,title,body,created_time,updated_time,parent_id,is_todo,todo_completed',
      },
    });
    return data;
  }

  async getAllNotes(): Promise<JoplinNote[]> {
    const notes: JoplinNote[] = [];
    let page = 1;
    let hasMore = true;
    const MAX_PAGES = 500; // ~50k notes safeguard

    while (hasMore && page <= MAX_PAGES) {
      const result = await this.getNotes(page, 100);
      notes.push(...result.items);
      hasMore = result.has_more;
      page++;
    }

    return notes;
  }

  async getNote(id: string): Promise<JoplinNote> {
    this.ensureConnected();
    const { data } = await this.client!.get(`/notes/${id}`, {
      params: {
        fields: 'id,title,body,created_time,updated_time,parent_id,is_todo,todo_completed,source_url',
      },
    });
    // Fetch tags for this note
    const tags = await this.getNoteTags(id);
    return { ...data, tags };
  }

  async createNote(note: Partial<JoplinNote>): Promise<JoplinNote> {
    this.ensureConnected();
    const { data } = await this.client!.post('/notes', note);
    return data;
  }

  async updateNote(id: string, changes: Partial<JoplinNote>): Promise<JoplinNote> {
    this.ensureConnected();
    const { data } = await this.client!.put(`/notes/${id}`, changes);
    return data;
  }

  async deleteNote(id: string): Promise<void> {
    this.ensureConnected();
    await this.client!.delete(`/notes/${id}`);
  }

  // Search
  async searchNotes(query: string): Promise<JoplinNote[]> {
    this.ensureConnected();
    const { data } = await this.client!.get('/search', {
      params: {
        query,
        type: 'note',
        fields: 'id,title,body,created_time,updated_time,parent_id',
        limit: 100,
      },
    });
    return data.items || [];
  }

  // Notebooks (Folders)
  async getNotebooks(): Promise<JoplinNotebook[]> {
    this.ensureConnected();
    const { data } = await this.client!.get('/folders', {
      params: {
        fields: 'id,title,parent_id,created_time,updated_time',
      },
    });
    return this.buildNotebookTree(data.items || []);
  }

  private buildNotebookTree(notebooks: JoplinNotebook[]): JoplinNotebook[] {
    const map: Record<string, JoplinNotebook> = {};
    const roots: JoplinNotebook[] = [];

    notebooks.forEach(nb => {
      map[nb.id] = { ...nb, children: [] };
    });

    notebooks.forEach(nb => {
      if (nb.parent_id && map[nb.parent_id]) {
        map[nb.parent_id].children!.push(map[nb.id]);
      } else {
        roots.push(map[nb.id]);
      }
    });

    return roots;
  }

  async createNotebook(title: string, parentId?: string): Promise<JoplinNotebook> {
    this.ensureConnected();
    const { data } = await this.client!.post('/folders', {
      title,
      parent_id: parentId || '',
    });
    return data;
  }

  async getNotesByNotebook(notebookId: string): Promise<JoplinNote[]> {
    this.ensureConnected();
    const notes: JoplinNote[] = [];
    let page = 1;
    let hasMore = true;
    const MAX_PAGES = 500;
    while (hasMore && page <= MAX_PAGES) {
      const { data } = await this.client!.get(`/folders/${notebookId}/notes`, {
        params: {
          fields: 'id,title,body,created_time,updated_time,parent_id,is_todo,todo_completed',
          limit: 100,
          page,
        },
      });
      notes.push(...(data.items || []));
      hasMore = data.has_more ?? false;
      page++;
    }
    return notes;
  }

  // Tags
  async getTags(): Promise<JoplinTag[]> {
    this.ensureConnected();
    const { data } = await this.client!.get('/tags', {
      params: { fields: 'id,title', limit: 200 },
    });
    return data.items || [];
  }

  async getNoteTags(noteId: string): Promise<JoplinTag[]> {
    this.ensureConnected();
    const { data } = await this.client!.get(`/notes/${noteId}/tags`, {
      params: { fields: 'id,title' },
    });
    return data.items || [];
  }

  async createTag(title: string): Promise<JoplinTag> {
    this.ensureConnected();
    const { data } = await this.client!.post('/tags', { title });
    return data;
  }

  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    this.ensureConnected();
    await this.client!.post(`/tags/${tagId}/notes`, { id: noteId });
  }

  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    this.ensureConnected();
    await this.client!.delete(`/tags/${tagId}/notes/${noteId}`);
  }

  async getNotesByTag(tagId: string): Promise<JoplinNote[]> {
    this.ensureConnected();
    const { data } = await this.client!.get(`/tags/${tagId}/notes`, {
      params: {
        fields: 'id,title,body,created_time,updated_time,parent_id,is_todo,todo_completed',
        limit: 100,
      },
    });
    return data.items || [];
  }

  // Search attachments globally
  async searchResources(query: string): Promise<JoplinResource[]> {
    this.ensureConnected();
    const { data } = await this.client!.get('/search', {
      params: { query, type: 'resource', fields: 'id,title,mime,size,file_extension', limit: 50 },
    });
    return data.items || [];
  }

  // Revisions (version history)
  async getRevisions(noteId: string): Promise<JoplinRevision[]> {
    this.ensureConnected();
    const { data } = await this.client!.get(`/notes/${noteId}/revisions`, {
      params: { fields: 'id,item_id,item_updated_time,metadata', limit: 50 },
    });
    return data.items || [];
  }

  async getRevisionNote(noteId: string, revisionId: string): Promise<{ title: string; body: string }> {
    this.ensureConnected();
    const { data } = await this.client!.get(`/notes/${noteId}/revisions/${revisionId}`, {
      params: { fields: 'title,body' },
    });
    return data;
  }

  // Attachments (resources)
  async getNoteResources(noteId: string): Promise<JoplinResource[]> {
    this.ensureConnected();
    const { data } = await this.client!.get(`/notes/${noteId}/resources`, {
      params: { fields: 'id,title,mime,size,file_extension', limit: 100 },
    });
    return data.items || [];
  }

  getResourceUrl(resourceId: string): string {
    if (!this.config) return '';
    return `http://${this.config.host}:${this.config.port}/resources/${resourceId}/file?token=${this.config.token}`;
  }

  getConfig(): JoplinConfig | null {
    return this.config;
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

export const joplinService = new JoplinService();
