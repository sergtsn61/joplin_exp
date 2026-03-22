import { useState, useEffect, useRef } from 'react';
import { LayoutTemplate, X, ChevronRight } from 'lucide-react';
import type { NoteTemplate } from '../types';

const TEMPLATES: NoteTemplate[] = [
  {
    id: 'meeting',
    name: 'Meeting Notes',
    icon: '👥',
    title: 'Meeting — {date}',
    body: `## Attendees
-

## Agenda
1.

## Discussion
###

## Action Items
- [ ]

## Next Meeting
Date:
`,
  },
  {
    id: 'daily',
    name: 'Daily Log',
    icon: '📅',
    title: 'Daily Log — {date}',
    body: `## Today's Goals
- [ ]
- [ ]
- [ ]

## Done
-

## Notes & Ideas


## Tomorrow
- [ ]
`,
  },
  {
    id: 'todo',
    name: 'To-Do List',
    icon: '✅',
    title: 'To-Do — {date}',
    body: `## High Priority
- [ ]

## Medium Priority
- [ ]

## Low Priority
- [ ]

## Completed
- [x]
`,
  },
  {
    id: 'research',
    name: 'Research Note',
    icon: '🔬',
    title: 'Research: ',
    body: `## Topic


## Key Findings


## Sources
-

## Questions
-

## Summary

`,
  },
  {
    id: 'idea',
    name: 'Idea / Concept',
    icon: '💡',
    title: 'Idea: ',
    body: `## The Idea


## Problem it Solves


## How it Works


## Pros & Cons
**Pros:**
-

**Cons:**
-

## Next Steps
- [ ]
`,
  },
  {
    id: 'project',
    name: 'Project Plan',
    icon: '🚀',
    title: 'Project: ',
    body: `## Overview


## Goals
-

## Milestones
| Milestone | Due | Status |
|-----------|-----|--------|
| | | |

## Tasks
- [ ]

## Resources


## Notes

`,
  },
  {
    id: 'review',
    name: 'Book / Article Review',
    icon: '📖',
    title: 'Review: ',
    body: `## Title & Author


## Key Takeaways
1.
2.
3.

## Quotes
>

## My Notes


## Rating
⭐⭐⭐⭐⭐ / 5
`,
  },
  {
    id: 'bug',
    name: 'Bug Report',
    icon: '🐛',
    title: 'Bug: ',
    body: `## Description


## Steps to Reproduce
1.
2.
3.

## Expected Behavior


## Actual Behavior


## Environment
- OS:
- Version:

## Possible Fix

`,
  },
];

interface NoteTemplatesProps {
  onSelect: (title: string, body: string) => void;
  onClose: () => void;
}

export function NoteTemplates({ onSelect, onClose }: NoteTemplatesProps) {
  const [search, setSearch] = useState('');

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const filtered = TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const apply = (template: NoteTemplate) => {
    const title = template.title.replace('{date}', today);
    onSelect(title, template.body);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="font-semibold flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-green-400" />
            Note Templates
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3">
          <input
            autoFocus
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-green-500"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-80 overflow-y-auto px-2 pb-3 space-y-1">
          {filtered.map(template => (
            <button
              key={template.id}
              onClick={() => apply(template)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors text-left"
            >
              <span className="text-xl w-8 text-center">{template.icon}</span>
              <span className="flex-1 text-sm font-medium">{template.name}</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">No templates found</p>
          )}
        </div>
      </div>
    </div>
  );
}
