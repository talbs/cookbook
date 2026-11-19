// A note's title is the bold title it opens with ("**Fingertip tight** — ..."), or else its own first sentence,
// so the cook can tell whether it's worth opening. The title stays on show when the note opens, so the body
// is only what follows it.
export function splitNoteTitle(noteMarkdown) {
  const note = noteMarkdown.trim();
  const writtenTitle = note.match(/^\*\*(.+?)\*\*\s*(?:[—–-]\s*)?/);
  if (writtenTitle) {
    return { title: writtenTitle[1], rest: note.slice(writtenTitle[0].length).trim() };
  }
  const firstParagraph = note.split(/\n\s*\n/)[0];
  const title = firstSentence(firstParagraph);
  return { title, rest: note.slice(title.length).trim() };
}

function firstSentence(text) {
  const sentence = text.match(/^.*?[.!?](?=\s|$)/);
  return sentence ? sentence[0] : text;
}
