# User Experience

## Core Loop

- Input: Text, mic, or voice shortcut
- Agent actions: Multi-step reasoning + tool calls
- Transparency: Collapsible step log with status indicators
- Feedback: Thumbs up/down + optional inline comment
- Session log: Auto-saved history with resume flow

## UI Elements

- Chat feed with streaming responses
- Input bar with text + mic toggle
- Feedback controls inline
- Collapsible step timeline: pill toggle ("▸ N actions"), each step shows a human-friendly label (e.g. "Fetching notes for XYZ"), colored left-border accent by status (amber=running, green=ok, red=failed).
  - `fetch_notes`: lists each note as a tappable row (tap → push conversation onto stack); ↓/↑ button expands/collapses long note text.
  - `save_note`: shows the saved note text (expandable if long).
  - `list_customers`: renders names as a bullet list, first 3 shown with "show N more…" toggle; empty → "→ Empty".
  - `read_skill` / generic: expandable text block (3 lines collapsed, tap to expand).
- Session history sidebar (slide-in drawer, title + date list, search, resume or new conversation; 📝 indicator on sessions that saved at least one note)
- Live conversation view (voice playback, waveform, interrupt) ✓
- Export/share recap
- Live conversational mode with agent speaking back ✓
- Siri/voice shortcut integration
- Offline/poor-network fallback
- Customers list in top right corner. Allows searching customers, their conversations and notes
