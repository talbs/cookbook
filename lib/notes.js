// A note must open with a bold title ("**Fingertip tight** — ..."), so the cook can tell whether it's worth
// opening. The title stays on show when the note opens, so the body is only what follows it.
export function splitNoteTitle(noteMarkdown) {
  const note = noteMarkdown.trim();
  // The dash stays on the title's line, so a list starting on the next line keeps its first bullet.
  const writtenTitle = note.match(/^\*\*(.+?)\*\*[ \t]*(?:[—–-]\s*)?/);
  if (!writtenTitle) return null;
  return { title: writtenTitle[1], rest: note.slice(writtenTitle[0].length).trim() };
}

// Each "> " line arrives as its own note, so a list written across several lines continues the note above it.
export function isListItem(noteMarkdown) {
  return /^\s*(?:\d+[.)]|[-*+])\s/.test(noteMarkdown);
}
