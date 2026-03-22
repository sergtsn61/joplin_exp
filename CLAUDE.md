# CLAUDE.md — Joplin AI Manager

> Этот файл ведётся автоматически Claude Code и фиксирует все этапы разработки проекта.

---

## Проект

**Название:** Joplin AI Manager
**Репозиторий:** `sergtsn61/joplin_exp`
**Ветка разработки:** `claude/joplin-ai-note-manager-60Zr2`
**Стек:** React 19 + TypeScript + Tailwind CSS v4 + Vite 8 + Tauri 2

---

## Цель проекта

Десктопное приложение для:
- Просмотра, сортировки и каталогизации заметок из **Joplin**
- Редактирования заметок в **Markdown** (CodeMirror 6)
- Подключения к **нейросетям** (локальный Ollama + облачные API)
- **Экспорта** заметок в `.md`, `.html`, `.pdf`

---

## Этапы разработки

---

### Этап 1 — Инициализация проекта
**Статус:** ✅ Завершён
**Коммит:** `72c360c`

**Действия:**
- Создан проект `npm create vite@latest . -- --template react-ts`
- Установлен Node.js стек зависимостей
- Настроен `vite.config.ts` с портом `1420` (Tauri-совместимый)

**Команды:**
```bash
npm create vite@latest . -- --template react-ts
npm install
```

---

### Этап 2 — Настройка Tailwind CSS v4
**Статус:** ✅ Завершён
**Коммит:** `72c360c`

**Действия:**
- Установлен `tailwindcss@latest` + `@tailwindcss/vite` + `@tailwindcss/typography`
- В Tailwind v4 нет `tailwind.config.js` — конфигурация через CSS
- В `index.css` добавлены директивы `@import "tailwindcss"` и `@plugin "@tailwindcss/typography"`
- Добавлен плагин `@tailwindcss/vite` в `vite.config.ts`

**Ключевые файлы:**
- `src/index.css` — базовые стили + Tailwind
- `vite.config.ts` — подключение плагина

**Замечание:** `@import "@tailwindcss/typography"` не работает в v4 — нужен `@plugin`.

---

### Этап 3 — Установка зависимостей
**Статус:** ✅ Завершён
**Коммит:** `72c360c`

**Установленные пакеты:**

| Пакет | Версия | Назначение |
|-------|--------|-----------|
| `zustand` | ^5.0 | Глобальный стейт + persist |
| `axios` | ^1.13 | HTTP клиент для Joplin API |
| `@codemirror/view` | ^6.40 | Ядро редактора |
| `@codemirror/state` | ^6.6 | Состояние редактора |
| `@codemirror/lang-markdown` | ^6.5 | Markdown синтаксис |
| `@codemirror/theme-one-dark` | ^6.1 | Тёмная тема |
| `@codemirror/language-data` | ^6.5 | Подсветка 100+ языков |
| `codemirror` | ^6.0 | Мета-пакет |
| `react-markdown` | ^10.1 | Рендеринг Markdown |
| `remark-gfm` | ^4.0 | GitHub Flavored Markdown |
| `lucide-react` | ^0.577 | Иконки |
| `marked` | ^17.0 | HTML из Markdown (для экспорта) |
| `@tauri-apps/api` | ^2.10 | Tauri JS API |

**Dev зависимости:**
- `@tauri-apps/cli` — CLI для сборки Tauri
- `@types/marked` — типы для marked

---

### Этап 4 — TypeScript типы
**Статус:** ✅ Завершён
**Коммит:** `72c360c`
**Файл:** `src/types/index.ts`

**Определённые типы:**
- `JoplinNote` — заметка Joplin (id, title, body, created_time, updated_time, parent_id, tags...)
- `JoplinNotebook` — блокнот с дочерними элементами (дерево)
- `JoplinTag` — тег
- `JoplinConfig` — настройки подключения (host, port, token)
- `AIProvider` — `'openai' | 'anthropic' | 'ollama' | 'openrouter'`
- `AIModel` — модель AI (id, name, provider)
- `AIConfig` — настройки AI (provider, model, apiKey, ollamaHost, temperature, maxTokens)
- `AIMessage` — сообщение чата (role, content)
- `ChatMessage` — сообщение в UI (id, role, content, timestamp)
- `ViewMode` — `'editor' | 'preview' | 'split'`
- `SortConfig` — сортировка (field, order)
- `FilterConfig` — фильтрация (search, notebookId, tagIds, showTodos)
- `AppSettings` — все настройки приложения
- `ExportFormat` — `'markdown' | 'pdf' | 'html'`

---

### Этап 5 — Joplin API сервис
**Статус:** ✅ Завершён
**Коммит:** `72c360c`
**Файл:** `src/services/joplin.ts`

**Реализованные методы:**

| Метод | Описание |
|-------|---------|
| `connect(config)` | Инициализация axios клиента |
| `ping()` | Проверка соединения |
| `getAllNotes()` | Все заметки (пагинация) |
| `getNote(id)` + теги | Одна заметка с тегами |
| `createNote(data)` | Создание заметки |
| `updateNote(id, changes)` | Обновление заметки |
| `deleteNote(id)` | Удаление заметки |
| `searchNotes(query)` | Полнотекстовый поиск |
| `getNotebooks()` | Блокноты (дерево) |
| `createNotebook(title, parentId)` | Создание блокнота |
| `getNotesByNotebook(id)` | Заметки блокнота |
| `getTags()` | Все теги |
| `getNoteTags(noteId)` | Теги заметки |
| `createTag(title)` | Создание тега |
| `addTagToNote(noteId, tagId)` | Добавить тег к заметке |
| `removeTagFromNote(noteId, tagId)` | Убрать тег |
| `getNotesByTag(tagId)` | Заметки по тегу |

**Особенности:**
- Автоматическая пагинация в `getAllNotes()` (по 100 заметок)
- Построение дерева блокнотов `buildNotebookTree()`
- Singleton паттерн — `export const joplinService = new JoplinService()`

---

### Этап 6 — AI сервис
**Статус:** ✅ Завершён
**Коммит:** `72c360c`
**Файл:** `src/services/ai.ts`

**Провайдеры:**

| Провайдер | Endpoint | Стриминг | Ключ |
|-----------|----------|---------|------|
| OpenAI | `api.openai.com/v1/chat/completions` | SSE | apiKey |
| Anthropic | `api.anthropic.com/v1/messages` | SSE | apiKey |
| Ollama | `localhost:11434/api/chat` | NDJSON | нет |
| OpenRouter | `openrouter.ai/api/v1/chat/completions` | SSE | apiKey |

**Высокоуровневые методы:**
- `summarizeNote(body, config)` — краткое резюме
- `improveNote(body, config)` — улучшение текста
- `generateTags(title, body, config)` — генерация тегов (JSON массив)
- `translateNote(body, lang, config)` — перевод на указанный язык
- `getOllamaModels(host)` — список локальных моделей
- `getPresetModels()` — предустановленные модели по провайдеру

**Стриминг:** Все методы поддерживают `onChunk` callback для потокового вывода.

---

### Этап 7 — Экспорт
**Статус:** ✅ Завершён
**Коммит:** `72c360c`
**Файл:** `src/services/export.ts`

**Методы:**

| Метод | Формат | Описание |
|-------|--------|---------|
| `downloadMarkdown(note)` | `.md` | YAML frontmatter + тело |
| `downloadMultipleMarkdown(notes)` | `.md` | Все заметки одним файлом |
| `printToPDF(note)` | PDF | Через window.print() |
| `downloadHTML(note)` | `.html` | HTML со стилями |

**Frontmatter в MD:**
```yaml
---
title: "Название заметки"
created: 2024-01-01T00:00:00.000Z
updated: 2024-01-02T00:00:00.000Z
tags: [тег1, тег2]
---
```

---

### Этап 8 — Глобальный стейт (Zustand)
**Статус:** ✅ Завершён
**Коммит:** `72c360c`
**Файл:** `src/store/index.ts`

**Хранимые данные:**
- `isConnected`, `isConnecting`, `connectionError` — состояние подключения
- `notes`, `notebooks`, `tags` — данные из Joplin
- `selectedNote` — открытая заметка
- `viewMode` — режим редактора (`editor | split | preview`)
- `sidebarOpen`, `aiPanelOpen` — состояние UI панелей
- `sort`, `filter` — сортировка и фильтрация
- `chatMessages`, `isAIThinking`, `aiError` — AI чат
- `settings` — все настройки

**Персистентность:** `zustand/middleware/persist` — сохраняет `settings`, `viewMode`, `sort`, `sidebarOpen` в `localStorage`.

**Автосохранение:** `saveCurrentNote()` вызывается через debounce (2 сек) в редакторе.

---

### Этап 9 — UI компоненты
**Статус:** ✅ Завершён
**Коммит:** `72c360c`

#### `ConnectionSetup.tsx`
Экран первичного подключения к Joplin. Поля: Host, Port, API Token. Инструкция где найти токен.

#### `Sidebar.tsx`
- Поиск по заметкам
- Кнопка создания заметки
- "All Notes" и "To-dos" фильтры
- Дерево блокноков (рекурсивный `NotebookItem`)
- Облако тегов
- Кнопки Settings и Disconnect

#### `NoteList.tsx`
- Сортировка по title / updated / created (с иконкой направления)
- Отображение: иконка типа + заголовок + дата + превью текста
- Индикатор to-do статуса (checkbox)
- Счётчик заметок

#### `NoteEditor.tsx`
- CodeMirror 6 редактор с поддержкой 100+ языков
- Редактируемый заголовок (клик → input)
- Переключатель режимов: Editor / Split / Preview
- Тулбар: AI Quick Actions, Save, Export dropdown, Tags, Delete
- Статусбар: строки, символы, слова, время сохранения
- Автосохранение с задержкой 2 сек

#### `AIPanel.tsx`
- Стриминговый чат с AI
- Контекст текущей заметки
- Подсказки при пустом чате
- Кнопки: Clear chat, Close
- Копирование ответов
- Отображение провайдера и модели

#### `AIQuickActions.tsx`
- Dropdown с действиями: Summarize, Improve Writing, Suggest Tags, Translate
- Вложенное меню выбора языка перевода (9 языков)

#### `SettingsModal.tsx`
- Вкладки: Joplin / AI / Editor
- Joplin: Host, Port, Token, Reconnect
- AI: Provider, API Key, Ollama Host + кнопка обновления моделей, Model selector, Temperature slider, Max Tokens slider
- Editor: Font Size, Word Wrap toggle

---

### Этап 10 — Tauri конфигурация
**Статус:** ✅ Завершён
**Коммит:** `72c360c`

**Файл:** `src-tauri/tauri.conf.json`

```json
{
  "productName": "Joplin AI Manager",
  "identifier": "com.joplin-ai-manager.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420"
  },
  "app": {
    "windows": [{
      "width": 1280,
      "height": 800,
      "minWidth": 900,
      "minHeight": 600,
      "center": true
    }]
  }
}
```

---

### Этап 11 — Сборка и проверка
**Статус:** ✅ Завершён
**Коммит:** `72c360c`

**Результат `npm run build`:**
- Компиляция TypeScript — без ошибок
- Vite build — успешно
- Размер бандла: ~671 kB JS (+ chunked языковые файлы CodeMirror)

**Исправленные ошибки:**
- `verbatimModuleSyntax` — все типы переведены на `import type {}`
- `@tailwindcss/typography` — исправлен синтаксис на `@plugin`
- Удалены неиспользуемые импорты (`ArrowUpDown`, `SortOrder`)
- Добавлен `@codemirror/language-data` в зависимости

---

## Команды разработки

```bash
# Разработка
npm run dev           # Vite dev server на порту 1420
npm run tauri:dev     # Tauri desktop в режиме разработки

# Сборка
npm run build         # TypeScript + Vite production build
npm run tauri:build   # Собрать .exe / .deb / .dmg

# Проверка
npm run lint          # ESLint
```

---

## Переменные окружения / Настройки

Все настройки хранятся в `localStorage` под ключом `joplin-ai-store`.

| Настройка | По умолчанию | Описание |
|-----------|-------------|---------|
| `joplin.host` | `localhost` | Хост Joplin |
| `joplin.port` | `41184` | Порт Web Clipper |
| `joplin.token` | — | API токен |
| `ai.provider` | `ollama` | AI провайдер |
| `ai.model` | `llama3.2` | Модель |
| `ai.ollamaHost` | `http://localhost:11434` | Адрес Ollama |
| `ai.temperature` | `0.7` | Температура генерации |
| `ai.maxTokens` | `2048` | Макс. токенов |
| `editor.fontSize` | `14` | Размер шрифта |
| `editor.wordWrap` | `true` | Перенос строк |

---

## Известные ограничения

| Ограничение | Описание |
|-------------|---------|
| PDF экспорт | Через `window.print()` — нужно разрешить попапы в браузере |
| CORS | При запуске как веб-приложение нужен CORS-прокси для Joplin |
| Tauri + Joplin | В Tauri работает нативно без CORS проблем |
| Ollama CORS | Нужно запустить Ollama с `OLLAMA_ORIGINS=*` |

---

## История коммитов

| Хэш | Описание |
|-----|---------|
| `72c360c` | feat: Joplin AI Manager — начальная реализация |

---

### Этап 12 — Запуск Desktop приложения
**Статус:** ✅ Завершён
**Коммит:** (текущий)
**Дата:** 2026-03-22

**Проблемы и решения:**

| Проблема | Решение |
|---------|--------|
| `libwebkit2gtk-4.1-0` не установлен | `apt-get install --fix-missing libwebkit2gtk-4.1-0 libwebkit2gtk-4.1-dev librsvg2-dev` |
| `libvpx9` 404 ошибка | `apt --fix-broken install` — нашёл корректную версию |
| `Port 1420 already in use` | `kill $(lsof -ti:1420)` |
| Нет дисплея в headless среде | Xvfb + fluxbox + x11vnc |

**Установленные системные зависимости Tauri 2:**
```bash
apt-get install -y libwebkit2gtk-4.1-0 libwebkit2gtk-4.1-dev \
  libssl-dev librsvg2-dev
apt --fix-broken install  # исправление зависимостей (libvpx9)
```

**Команды запуска (headless):**
```bash
# Виртуальный дисплей
Xvfb :99 -screen 0 1280x800x24 &
DISPLAY=:99 fluxbox &
x11vnc -display :99 -nopw -listen 0.0.0.0 -forever -bg

# Запуск приложения
DISPLAY=:99 npm run tauri:dev
```

**Результат компиляции Rust:**
```
Compiling app v0.1.0
Building [=======================>] 462/462: app
Finished `dev` profile [unoptimized + debuginfo] in 3.43s
Running `target/debug/app`
```

**Скриншот:** Приложение успешно запустилось — виден экран подключения к Joplin с полями Host/Port/Token.

**VNC доступ:** порт 5900 (без пароля, dev режим)

---

---

### Этап 13 — Мульти-Joplin агрегатор
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Новые возможности

**Мульти-инстансы:**
- Подключение к нескольким Joplin одновременно (динамически)
- Список инстансов с визуальным статусом (connected / error)
- Реконнект по кнопке

**Агрегация заметок:**
- Сбор всех заметок со всех подключённых инстансов в единый список
- Фильтрация по инстансу, поиск, сортировка

**Поиск дублей (`DuplicateDetector`):**
- Три метода: хэш тела, схожий заголовок (Levenshtein), AI-анализ
- UI: группы дублей → выбрать что оставить / удалить всё
- Пакетная AI-проверка с прогресс-баром

**AI-классификация тем (`TopicClassifier`):**
- Пакетная отправка заметок в AI → JSON с топиками
- Визуализация тематических групп
- Ручная корректировка темы каждой заметки (inline edit)

**Сборка блокнотов (`NotebookBuilder`):**
- Создание планов: имя блокнота + темы + целевой инстанс
- Создание блокнота в Joplin через API
- Копирование заметок по темам в новый блокнот
- Экспорт в `.md` файл (все заметки плана)
- Экспорт в PDF (через window.print)

#### Новые файлы

| Файл | Назначение |
|------|-----------|
| `src/types/index.ts` | + `JoplinInstance`, `AggregatedNote`, `DuplicateGroup`, `TopicGroup`, `NoteTopicMap`, `BuildTarget`, `AppView` |
| `src/services/aggregator.ts` | Подключение к нескольким Joplin, агрегация заметок |
| `src/services/deduplication.ts` | Поиск дублей (hash, title, AI) |
| `src/services/classifier.ts` | AI-классификация по темам, ручная корректировка |
| `src/store/aggregator.ts` | Zustand store для мульти-инстанс состояния |
| `src/components/MultiJoplinManager.tsx` | UI управления инстансами |
| `src/components/AggregatorView.tsx` | Агрегированный список заметок |
| `src/components/DuplicateDetector.tsx` | UI поиска и разрешения дублей |
| `src/components/TopicClassifier.tsx` | UI классификации по темам |
| `src/components/NotebookBuilder.tsx` | Сборка и экспорт блокнотов |

#### Изменённые файлы

- `src/App.tsx` — добавлен левый навигационный рейл с 5 вкладками + кнопка инстансов

#### Навигация

```
[Notes] [Aggregate] [Duplicates] [Topics] [Builder] ... [Instances]
```

---

---

### Этап 14 — Расширение функциональности (все roadmap пункты)
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Реализовано

| Фича | Файл | Описание |
|------|------|---------|
| **ZIP-экспорт** | `NotebookBuilder.tsx` | JSZip — папки по темам, frontmatter в каждом .md |
| **AI-слияние дублей** | `DuplicateDetector.tsx` | Кнопка "Merge with AI" → превью → применить |
| **Горячие клавиши** | `hooks/useHotkeys.ts` | Ctrl+S (save), F11 (fullscreen), Ctrl+P (preview), Esc |
| **Полноэкранный редактор** | `NoteEditor.tsx` | Кнопка Maximize2/Minimize2, fixed inset-0 |
| **История версий** | `VersionHistory.tsx` | Joplin revisions API, превью + Restore |
| **Шаблоны заметок** | `NoteTemplates.tsx` | 8 шаблонов: Meeting, Daily, Todo, Research, Idea, Project, Review, Bug |
| **Вложения** | `AttachmentsPanel.tsx` | Sidebar с ресурсами, превью изображений/аудио/видео, download |
| **Тёмная/светлая тема** | `App.tsx` + `index.css` | CSS filter invert, переключатель Sun/Moon в nav rail |

#### Новые файлы

| Файл | Назначение |
|------|-----------|
| `src/hooks/useHotkeys.ts` | Универсальный хук для глобальных горячих клавиш |
| `src/components/VersionHistory.tsx` | Модал истории версий с diff preview и Restore |
| `src/components/AttachmentsPanel.tsx` | Панель вложений заметки (ресурсы Joplin) |
| `src/components/NoteTemplates.tsx` | Модал выбора шаблона (8 шаблонов) |

#### Расширенные файлы

- `src/services/joplin.ts` — `getRevisions()`, `getRevisionNote()`, `getNoteResources()`, `getResourceUrl()`
- `src/types/index.ts` — `JoplinRevision`, `JoplinResource`, `NoteTemplate`
- `src/components/NoteEditor.tsx` — fullscreen, hotkeys, templates, version history, attachments
- `src/components/DuplicateDetector.tsx` — AI merge button + preview
- `src/components/NotebookBuilder.tsx` — ZIP export button
- `src/App.tsx` — theme toggle button (Sun/Moon) в nav rail

#### Горячие клавиши

| Клавиша | Действие |
|---------|---------|
| `Ctrl+S` | Сохранить заметку |
| `F11` | Полноэкранный режим |
| `Esc` | Выйти из полноэкранного режима |
| `Ctrl+P` | Переключить Editor ↔ Preview |

---

---

### Этап 15 — Остаток roadmap
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Реализовано

| Фича | Файлы | Описание |
|------|-------|---------|
| **Drag & drop** | `NoteList.tsx` + `Sidebar.tsx` | Тащи заметку на блокнот → `updateNote(parent_id)`. Блокнот подсвечивается зелёным при наведении |
| **Массовые теги** | `NoteList.tsx` | Кнопка ✔✔ в шапке → multi-select чекбоксы → "Add Tag" dropdown → `bulkAddTag()` |
| **Статистика** | `StatsView.tsx` | Вкладка Stats: 4 summary cards, activity bars (30 дней), notebook/note size charts |
| **Поиск вложений** | `ResourceSearch.tsx` | Вкладка Attachments: поиск по имени через Joplin search API, превью медиа |
| **Экспорт/импорт настроек** | `SettingsModal.tsx` | Кнопки Export JSON / Import JSON в футере Settings |

#### Новые файлы

| Файл | Назначение |
|------|-----------|
| `src/components/StatsView.tsx` | Статистика коллекции |
| `src/components/ResourceSearch.tsx` | Глобальный поиск вложений |

#### Навигация (итого 7 вкладок)

```
[Notes] [Aggregate] [Duplicates] [Topics] [Builder] [Stats] [Attachments]
                                                       + [☀/🌙] [Instances]
```

---

### Этап 16 — AI Notebook Compiler (главная фича)
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Назначение
Выбираешь блокнот → кнопка ✨ AI → AI синтезирует все заметки в единый структурированный документ.

#### Реализовано

| Фича | Описание |
|------|---------|
| **Компиляция** | 6 типов: Методичка, Статья, Конспект, Туториал, Чеклист, FAQ |
| **Стриминг** | Документ появляется в реальном времени |
| **Итеративное редактирование** | Поле ввода снизу: "сделай раздел X подробнее", "добавь примеры" |
| **История версий** | Таблетки v1/v2/v3… — переключение между генерациями |
| **Diff-сравнение** | Кнопка Diff: было/стало, удалённое красным, новое зелёным (LCS-алгоритм) |
| **Шаблоны промптов** | Сохранить настройки как именованный шаблон → применить одним кликом |
| **Системный промпт** | Переопределить встроенный промпт редактора |
| **T / P слайдеры** | Температура (0–2) и Top-P (0.01–1.0) |
| **Max токенов** | Размер ответа (256–16384) |
| **Окно контекста** | Поле с автоопределением по модели (GPT-4o=128k, Claude=200k, Ollama/qwen=32k…) |
| **Индикатор контекста** | Прогресс-бар: ~N/M токенов (%), зелёный/жёлтый/красный |
| **Сохранение** | Результат → новая заметка в Joplin |

#### Новые/изменённые файлы

| Файл | Изменение |
|------|----------|
| `src/components/NotebookCompiler.tsx` | Новый компонент |
| `src/components/NoteList.tsx` | Кнопка ✨ AI (при выборе блокнота) |
| `src/types/index.ts` | + `topP`, `contextSize`, `systemPrompt` в `AIConfig` |
| `src/services/ai.ts` | + `top_p` во всех провайдерах; `num_ctx` в Ollama |

---

### Этап 17 — Рефакторинг и чистка кода
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Исправленные проблемы

| Файл | Проблема | Решение |
|------|---------|---------|
| `NotebookCompiler.tsx` | Дублирование `generate/refine` (~100 строк) | Единый хелпер `runStream()` |
| `NotebookCompiler.tsx` | Race condition версий при setState | Атомарное обновление индекса внутри setter |
| `NotebookCompiler.tsx` | `saveNote` без обработки ошибок | try/catch → показывает ошибку в UI |
| `ai.ts` | `response.body!` без проверки | Явная проверка с информативным сообщением |
| `ai.ts` | `continue` на `[DONE]` вместо остановки | `streamDone` флаг → выход из обоих циклов |
| `store/index.ts` | `setTimeout(..., 0)` в `setFilter` | Прямой вызов `get().loadNotes()` |
| `types/index.ts` | Мёртвые типы `AIRequest`, `AIResponse` | Удалены |

---

### Этап 18 — AI Agent для пакетного редактирования заметок блокнота
**Статус:** ✅ Завершён
**Коммит:** `af1bc71`
**Дата:** 2026-03-22

#### Назначение
Выбираешь блокнот → кнопка 🤖 **Agent** → AI-агент обрабатывает каждую заметку по заданной инструкции, показывает результат, ждёт одобрения, затем сохраняет в Joplin.

#### Реализовано

| Фича | Описание |
|------|---------|
| **Инструкция** | Произвольный текст + 8 пресетов (Fix grammar, Translate EN/RU, TL;DR, Bullet points, Expand, Shorten, Add code examples) |
| **Выбор заметок** | Чекбоксы All/None + индивидуальный выбор |
| **Стриминг** | Результат появляется в реальном времени для каждой заметки |
| **Before / After** | Вкладки для сравнения оригинала и результата |
| **Approve / Skip** | Решение per-note перед сохранением |
| **Apply All** | Сохраняет все одобренные заметки в Joplin через API |
| **Stop** | Прерывание обработки в любой момент |
| **Навигация** | Точечная навигация с цветовым статусом (ожидание/обработка/готов/одобрен/сохранён/пропущен) |
| **Прогресс-бар** | X/N заметок обработано |

#### Новые/изменённые файлы

| Файл | Изменение |
|------|----------|
| `src/components/NotebookAgentModal.tsx` | Новый компонент |
| `src/components/NoteList.tsx` | Кнопка 🤖 Agent (рядом с ✨ AI, при активном фильтре блокнота/тега) |

#### UI-флоу

```
Sidebar: выбрать блокнот
→ NoteList шапка: [🤖 Agent] [✨ AI]
→ NotebookAgentModal:
    Левая панель: инструкция + список заметок + [Run Agent]
    Правая панель: стриминг текущей заметки + [Approve] [Skip]
→ [Apply N to Joplin] → сохраняет одобренные
```

---

---

### Этап 19 — UX-фиксы и настройка Ollama num_ctx
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Реализовано

| Фича | Файл | Описание |
|------|------|---------|
| **Иконочные кнопки Agent/AI** | `NoteList.tsx` | Кнопки без текста (иконки) — не обрезаются при узкой колонке |
| **Компактная Sort-панель** | `NoteList.tsx` | `shrink-0`, `gap-0.5`, метки `Upd`/`New` — все кнопки умещаются |
| **Ширина колонки заметок** | `App.tsx` | `w-64` → `w-80` (256 → 320 px) |
| **Ollama num_ctx** | `SettingsModal.tsx`, `ai.ts`, `types/index.ts` | Поле в Settings → AI для задания окна контекста Ollama (2048–1 048 576, дефолт 32 768); передаётся как `num_ctx` в каждый запрос; `contextSize` компилятора перекрывает его |

---

### Этап 20 — Code review: логика, математика, чистота
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Исправлено (6 проблем)

| Файл | Проблема | Исправление |
|------|---------|------------|
| `NotebookCompiler.tsx` | Деление на ноль при `localContextSize = 0` | Гвардия `localContextSize > 0`, fallback → 100% |
| `store/index.ts` | Stale closure в `sendMessage`: `chatMessages` захвачен до `set()` | Заменён на `get().chatMessages` |
| `store/index.ts` | Null-safety в фильтре поиска | `(n.title ?? '').toLowerCase()` и `(n.body ?? '')` |
| `services/aggregator.ts` | Race condition: `results.push()` внутри `Promise.allSettled` | Возвращаем массив из callback, пушим в `fulfilled` ветке |
| `components/NotebookAgentModal.tsx` | `(err as Error).message` — небезопасный каст | `err instanceof Error ? err.message : String(err)` |
| `services/export.ts` | YAML-теги не экранируют `\n`/`\r` | `.replace(/\n/g, '\\n').replace(/\r/g, '')` |

---

---

### Этап 21 — Google Gemini + code review AI Compiler
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Реализовано

| Фича | Файл | Описание |
|------|------|---------|
| **Google Gemini провайдер** | `ai.ts`, `types/index.ts`, `SettingsModal.tsx` | SSE-стриминг через `streamGenerateContent?alt=sse`; модели: gemini-2.0-flash, 2.0-flash-lite, 1.5-pro, 1.5-flash; пресет контекста 1M токенов |
| **Сброс ошибки компилятора** | `NotebookCompiler.tsx` | Кнопка `×` на баннере ошибки; ошибка от прерванного запроса не отображается |
| **AbortController в компиляторе** | `NotebookCompiler.tsx` | `stop()` теперь реально прерывает fetch через `AbortController.abort()` |
| **Gemini в defaultContextSize** | `NotebookCompiler.tsx` | Все Gemini-модели → 1 000 000 токенов |
| **Мёртвый код удалён** | `NotebookCompiler.tsx` | `return newIdx` из `runStream` нигде не использовался |
| **`diff` мемоизирован** | `NotebookCompiler.tsx` | `useMemo` вместо пересчёта LCS O(m×n) при каждом рендере |
| **Лишняя аннотация типа** | `NotebookCompiler.tsx` | `(note: JoplinNote)` в `.map` убрана — TypeScript выводит сам |

---

### Этап 22 — Code review: Collection Statistics (StatsView)
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Исправлено (6 проблем)

| Файл | Проблема | Исправление |
|------|---------|------------|
| `StatsView.tsx` | `n.body.split(...)` / `n.body.length` — краш если body null | Хелпер `wordCount(body)` + `(body ?? '')` — везде в useMemo |
| `StatsView.tsx` | `stats.largest[0].body.split(...)` пересчитывается каждый рендер в `.map()` | Pre-computed `_words` в useMemo; `largestMaxWords` — отдельное поле |
| `StatsView.tsx` | Activity bar: `Math.max(2, ...)` для дней с count=0 → 2px столбик, хотя активности нет | `d.count > 0 ? Math.max(2, ...) : 1` — пустые дни 1px фон |
| `StatsView.tsx` | `tagStats`: `tags.slice(0, 8)` до подсчёта → топ-8 по первым тегам, а не по использованию | Сначала считаем все теги, сортируем, затем `slice(0, 8)` |
| `StatsView.tsx` | `key={nb.name}` в notebookStats → коллизия если два блокнота с одним именем | Добавлено `id` в stat-объект; `key={nb.id}` |
| `StatsView.tsx` | `avgWords` вычислялся вне useMemo → пересчёт каждый рендер | Перенесён внутрь useMemo, возвращается как `stats.avgWords` |

---

### Этап 23 — Code review: Search Attachments (ResourceSearch)
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Исправлено (8 проблем)

| Файл | Проблема | Исправление |
|------|---------|------------|
| `ResourceSearch.tsx` | Старые результаты видны во время новой загрузки | `setResults([])` в начале `handleSearch` |
| `ResourceSearch.tsx` | Превью не сбрасывается при новом поиске | `setPreview(null)` в начале `handleSearch` |
| `ResourceSearch.tsx` | Нет кнопки закрытия превью | Кнопка `×` с `onClick={() => setPreview(null)}` |
| `ResourceSearch.tsx` | `previewUrl` + `previewMime` — два стейта, могут рассинхронизироваться | Объединены в один `preview: { url, mime } \| null` |
| `ResourceSearch.tsx` | "No results" показывал текущий `query` (мог измениться) | Отдельный `lastQuery` — хранит именно тот запрос, по которому искали |
| `ResourceSearch.tsx` | `formatSize(undefined/null)` → `"NaN B"` | Гвардия `if (!bytes \|\| bytes < 0) return '0 B'` |
| `ResourceSearch.tsx` | `res.title \|\| \`file.${res.file_extension}\`` → `"file.undefined"` | Хелпер `getDisplayName`: `title → file.ext → 'Untitled'` |
| `ResourceSearch.tsx` | `download={res.title}` — title может быть пустым | Заменён на `download={getDisplayName(res)}` |

---

### Этап 24 — Code review: Settings (SettingsModal)
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Исправлено (10 проблем)

| Файл | Проблема | Исправление |
|------|---------|------------|
| `SettingsModal.tsx` | `parseInt(port)` → `NaN` при пустом поле → сохраняется в настройки | Хелпер `parsePort()`: валидирует 1–65535, fallback → 41184 |
| `SettingsModal.tsx` | `parseInt(port)` дублируется в `handleSave` и `handleReconnect` | Единый вызов `parsePort(port)` |
| `SettingsModal.tsx` | File input не сбрасывается → повторный импорт того же файла не работает | `e.target.value = ''` после чтения файла |
| `SettingsModal.tsx` | `alert()` для ошибки импорта — блокирует UI | Инлайн `importError` стейт, отображается в футере |
| `SettingsModal.tsx` | `ev.target?.result as string` без null-check | `typeof result !== 'string'` guard перед `JSON.parse` |
| `SettingsModal.tsx` | Export: `a.click()` без `appendChild` — проблема в Firefox | `appendChild` / `removeChild` паттерн |
| `SettingsModal.tsx` | Temperature max=2 для Anthropic → ошибка API (Anthropic max=1) | `TEMPERATURE_MAX` per provider; слайдер и значение зажимаются при сохранении |
| `SettingsModal.tsx` | `provider === 'openai' \|\| provider === 'anthropic' \|\| ...` | Упрощено до `provider !== 'ollama'` |
| `SettingsModal.tsx` | Word Wrap: `div` внутри `label` — семантически неверно | `button[role=switch][aria-checked]` |
| `SettingsModal.tsx` | `parseInt` без радикса | `parseInt(value, 10)` везде |

---

### Этап 25 — Глубокий code review всего проекта (security, logic, robustness)
**Статус:** ✅ Завершён
**Коммит:** `1f3d738`
**Дата:** 2026-03-22

#### Оценка здоровья проекта: 7.5 / 10 (было ~6/10)

#### Исправлено (10 проблем, 7 файлов)

| Файл | Проблема | Серьёзность | Исправление |
|------|---------|------------|------------|
| `export.ts` | **XSS**: `note.title` и теги инжектировались в `document.write` без экранирования | 🔴 Критично | Хелпер `escapeHtml()`, применён везде в `printToPDF` и `downloadHTML` |
| `export.ts` | **YAML**: `:` в тегах ломал YAML frontmatter | 🟡 Важно | Экранирование `:` → `&#58;` в значениях тегов |
| `ai.ts` | `response.body!` в `chatGemini` — non-null assertion без проверки | 🔴 Критично | Явная проверка с информативной ошибкой |
| `ai.ts` | **Frozen UI**: стриминг мог зависнуть навсегда при потере сети | 🟡 Важно | 60s timeout через `Promise.race` на каждый `reader.read()` |
| `store/index.ts` | **Тег-фильтр OR→AND**: заметки с *любым* тегом вместо *всех* | 🟡 Важно | Подсчёт количества совпадений тегов, фильтр `count === tagIds.length` |
| `store/index.ts` | `createNote` молча падал — пользователь не видел ошибки | 🟡 Важно | `catch` → `set({ connectionError: msg })` |
| `joplin.ts` | **Бесконечный цикл**: пагинация без ограничения | 🔴 Критично | `MAX_PAGES = 500` в `getAllNotes` и `getNotesByNotebook` |
| `AggregatorView.tsx` | `n.body.toLowerCase()` краш если `body = null` | 🔴 Критично | `(n.body ?? '').toLowerCase()` |
| `deduplication.ts` | Пустые заметки → одинаковый хэш → ложные дубли | 🟡 Важно | `if (!normalized) continue` в `findByHash`; `(n.body ?? '')` в AI-батче |
| `NoteEditor.tsx` | `saveTimerRef` не очищался при unmount → callback на мёртвый компонент | 🟡 Важно | `clearTimeout(saveTimerRef.current)` в cleanup функции useEffect |

#### Оставшиеся рекомендации (не критичные)

| Тема | Описание |
|------|---------|
| Lazy loading | `marked` импортируется статически и динамически — Vite предупреждает, bundle не сплитится |
| Gemini timeout | Добавить аналогичный 60s таймаут в инлайн-цикл `chatGemini` (там нет `readStream`) |
| Temperature slider | Визуально ограничить `max` слайдера до `TEMPERATURE_MAX[provider]` (сейчас только clamping при сохранении) |
| AI JSON validation | Нет runtime-валидации, что JSON от AI classifier соответствует `Record<string, string>` |
| Bundle splitting | 924KB main chunk — стоит split по вкладкам через `React.lazy` |

---

---

### Этап 26 — UI/UX аудит приложения
**Статус:** ✅ Завершён
**Дата:** 2026-03-22

#### Методология
Полный анализ 19 компонентов: структура, взаимодействие, доступность, адаптивность.

---

#### 🔴 Критичные проблемы

| # | Компонент | Проблема | Решение |
|---|-----------|---------|---------|
| 1 | `NoteEditor.tsx` | **Переполнение тулбара** — слишком много кнопок в одной строке, обрезаются на экранах < 1600px | Сгруппировать редкие действия (History, Templates, Export) в `...` меню |
| 2 | `SettingsModal.tsx` | **Вертикальное переполнение** — AI-вкладка (Provider + API Key + Ollama + Models + T + MaxTokens + ContextSize + num_ctx) не помещается без прокрутки | Добавить `overflow-y-auto` внутри таба или разбить на подсекции |
| 3 | Несколько компонентов | **Стекирование модалов** — Settings + Export dropdown + Tag picker без чёткой z-index иерархии; нет focus trap | Ввести z-index систему; единый `<Modal>` с focus trap |

---

#### 🟡 Важные проблемы

| # | Компонент | Проблема | Решение |
|---|-----------|---------|---------|
| 4 | `App.tsx` + все панели | **Нет адаптивности** — Sidebar `w-56`, NoteList `w-80`, AIPanel `w-80`, AttachmentsPanel `w-64` — всё фиксировано; при открытом AIPanel редактору остаётся ~400px | Resizable panels или авто-скрытие AIPanel при узком экране |
| 5 | Все модалы | **Несогласованное закрытие** — SettingsModal (X + клик снаружи), NotebookCompiler (только X), VersionHistory (только X), NoteTemplates (X + клик снаружи); ни один не закрывается по Escape | Единый паттерн: X + клик снаружи + Escape для всех модалов |
| 6 | `NoteList.tsx` | **Multi-select неочевиден** — кнопка входа маленькая, нет баннера "режим выбора", выход только по X, Escape не работает | Баннер "Выбрано N заметок" + Escape для выхода |
| 7 | `NoteList.tsx` + `Sidebar.tsx` | **Drag & Drop без cursor feedback** — нет `cursor: grab/grabbing` на перетаскиваемых элементах; только зелёная подсветка блокнота | Добавить CSS курсоры + иконку "drop here" |

---

#### 🟠 Умеренные проблемы

| # | Компонент | Проблема | Решение |
|---|-----------|---------|---------|
| 8 | `NotebookCompiler.tsx` | **Нет Retry** — при ошибке генерации только баннер с `×`, пользователь начинает заново | Кнопка "Повторить" на баннере ошибки |
| 9 | `AIQuickActions.tsx`, Export menu, Tag picker | **Нет клавиатурной навигации** в дропдаунах — стрелки, Enter, Escape не работают | Добавить `onKeyDown` хендлеры |
| 10 | `NoteEditor.tsx` | **Теги обрезаются до 3** — нет индикатора "ещё N тегов" | Показывать `+N` бейдж с раскрытием |
| 11 | `Sidebar.tsx` | **Состояние дерева блокнотов сбрасывается** при смене фильтра | Сохранять expanded-состояние в session storage |
| 12 | `NoteEditor.tsx` | **Нет loading-состояния** при переключении заметок — редактор не показывает спиннер в отличие от NoteList | Добавить скелетон-загрузку |

---

#### 🟢 Мелкие улучшения

| # | Проблема | Решение |
|---|---------|---------|
| 13 | Нет счётчика вложений на кнопке AttachmentsPanel | Бейдж с числом ресурсов на кнопке тулбара |
| 14 | Горячие клавиши не задокументированы в UI | Кнопка `?` → shortcuts overlay (Ctrl+S, F11, Ctrl+P, Esc) |
| 15 | `text-gray-500` на `bg-gray-900` — слабый контраст | Проверить WCAG AA, усилить до `text-gray-400` |
| 16 | Icon-only кнопки без `aria-label` | Добавить aria-label для всех иконочных кнопок |
| 17 | "No results" без подсказок в ResourceSearch | Добавить hint: "Попробуйте другое слово или расширение" |
| 18 | Поиск в Sidebar не сбрасывается при смене фильтра на тег/блокнот | Очищать input при клике на тег или блокнот |
| 19 | `AggregatorView` — нативный `<select>` вместо кастомного дропдауна | Стилизовать под остальные компоненты |
| 20 | Нет skeleton-загрузки в NoteList | Заменить спиннер на skeleton cards |

---

#### Позитивные аспекты UX

| Аспект | Оценка |
|--------|--------|
| Тёмная тема — последовательна по всему приложению | ✅ |
| Drag & Drop для перемещения заметок между блокнотами | ✅ |
| Автосохранение (2 сек) с визуальной индикацией | ✅ |
| Split-режим редактора (Editor + Preview) | ✅ |
| Стриминг AI-ответов в реальном времени | ✅ |
| Прогресс-бары для долгих операций (AI scan, build) | ✅ |
| Разумные дефолты во всех настройках | ✅ |
| Богатые горячие клавиши (Ctrl+S, F11, Ctrl+P) | ✅ |

---

#### Предложенные пакеты реализации

**Пакет A — Критичный UX (быстрые wins):**
- Overflow `...` меню в тулбаре редактора
- `overflow-y-auto` + подсекции в SettingsModal
- Escape закрывает все модалы

**Пакет B — Комфорт:**
- Resizable или авто-скрытие AIPanel
- Баннер multi-select + Escape для выхода
- Retry кнопка в NotebookCompiler

**Пакет C — Полировка:**
- Счётчик вложений на кнопке тулбара
- Hotkeys overlay (`?`)
- Skeleton loading в NoteList
- Aria-labels на иконочных кнопках

---

## Следующие шаги (roadmap)

- [ ] Sync через Tauri FS (нативный файл настроек вне localStorage)
- [ ] Inline тег-редактор заметки (добавить/убрать теги без Settings)
- [ ] Массовое удаление / перемещение заметок
- [ ] Экспорт статистики в CSV
- [ ] **[UX Пакет A]** Overflow меню в тулбаре + Escape для модалов + SettingsModal scroll
- [ ] **[UX Пакет B]** Resizable panels + multi-select баннер + Retry в компиляторе
- [ ] **[UX Пакет C]** Счётчик вложений + Hotkeys overlay + Skeleton loading + Aria-labels
