import type { JoplinNote } from '../types';

class ExportService {
  // Export single note to Markdown
  noteToMarkdown(note: JoplinNote, includeMetadata = true): string {
    let md = '';

    if (includeMetadata) {
      const date = new Date(note.created_time);
      const updated = new Date(note.updated_time);
      md += '---\n';
      md += `title: "${note.title}"\n`;
      md += `created: ${date.toISOString()}\n`;
      md += `updated: ${updated.toISOString()}\n`;
      if (note.tags?.length) {
        md += `tags: [${note.tags.map(t => {
          const safe = t.title.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
          return `"${safe}"`;
        }).join(', ')}]\n`;
      }
      md += '---\n\n';
    }

    md += `# ${note.title}\n\n`;
    md += note.body;

    return md;
  }

  // Download markdown file
  downloadMarkdown(note: JoplinNote) {
    const content = this.noteToMarkdown(note);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.sanitizeFilename(note.title)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export multiple notes as a ZIP-like bundle (single md file)
  downloadMultipleMarkdown(notes: JoplinNote[]) {
    const content = notes
      .map(n => this.noteToMarkdown(n))
      .join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `joplin-export-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export note to PDF via print dialog
  async printToPDF(note: JoplinNote) {
    const { marked } = await import('marked');
    const html = await marked(note.body);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Could not open print window. Please allow popups.');
    }

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${note.title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #1a1a1a;
    }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    pre {
      background: #f4f4f4;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.9em;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
    }
    pre code { background: none; padding: 0; }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 0;
      padding-left: 16px;
      color: #666;
    }
    img { max-width: 100%; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; }
    th { background: #f4f4f4; }
    .meta {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #eee;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <div class="meta">
    <span>Created: ${new Date(note.created_time).toLocaleDateString()}</span>
    ${note.tags?.length ? `<span> · Tags: ${note.tags.map(t => t.title).join(', ')}</span>` : ''}
  </div>
  ${html}
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  // Export to HTML
  async downloadHTML(note: JoplinNote) {
    const { marked } = await import('marked');
    const html = await marked(note.body);

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${note.title}</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 4px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  ${html}
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.sanitizeFilename(note.title)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
  }
}

export const exportService = new ExportService();
