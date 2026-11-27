// A note must open with a bold title ("**Fingertip tight** — ..."), so the cook can tell whether it's worth
// opening. The title stays on show when the note opens, so the body is only what follows it.
export function splitNoteTitle(noteMarkdown) {
  const note = noteMarkdown.trim();
  // The dash stays on the title's line, so a list starting on the next line keeps its first bullet.
  const writtenTitle = note.match(/^\*\*(.+?)\*\*[ \t]*(?:[—–-]\s*)?/);
  if (!writtenTitle) return null;
  return { title: writtenTitle[1], rest: note.slice(writtenTitle[0].length).trim() };
}

// Each "> " line arrives as its own text item, so a list written across several lines joins the note above it.
export function joinListLines(sectionContent) {
  const joined = [];
  for (const content of sectionContent) {
    const previous = joined.at(-1);
    if (content.type === 'text' && previous?.type === 'text' && isListItem(content.value)) {
      previous.value += `\n\n${content.value}`;
    } else {
      joined.push({ ...content });
    }
  }
  return joined;
}

function isListItem(noteMarkdown) {
  return /^\s*(?:\d+[.)]|[-*+])\s/.test(noteMarkdown);
}

export function splitNoteParts(note) {
  if (!note) return [];
  return note
    .split(',')
    .map(part => part.trim())
    .filter(part => part !== '');
}

// Cook moves a note part that opens like this to the later step that uses the extra, so the build stops on any other wording.
export const EXTRA_AMOUNT_OPENING = /^(plus|or) more /;
