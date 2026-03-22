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

## Следующие шаги (roadmap)

- [ ] Drag & drop перетаскивание заметок между блокнотами
- [ ] Встроенный просмотр изображений из заметок
- [ ] Экспорт нескольких заметок в ZIP
- [ ] Шаблоны заметок
- [ ] История версий заметки через Joplin revisions API
- [ ] Горячие клавиши (Ctrl+S save, Ctrl+P preview...)
- [ ] Полноэкранный режим редактора
- [ ] Тёмная/светлая тема (переключатель)
- [ ] Синхронизация настроек через Tauri file system
- [ ] Поддержка вложений (attachments)
- [ ] Слияние двух дублирующих заметок в одну через AI
- [ ] Экспорт всего агрегатора в ZIP-архив
