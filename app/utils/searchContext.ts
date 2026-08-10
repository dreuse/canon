const MATCH_TAG = /<b[\s>]/i;

const SENTENCE_END = /(?:[.!?…]["'”’)\]]*\s+|\n+)/g;

const LEADING_PUNCTUATION = /^[^\p{L}\p{N}<]+/u;

const LEADING_WORD = /^\S+\s+/u;

const STARTS_LOWERCASE = /^\p{Ll}/u;

export function queryIsInTitle(title: string, query?: string): boolean {
  return !!query && title.toLowerCase().includes(query.toLowerCase());
}

export function trimSearchContext(context: string): string {
  const text = context.trim();
  const match = text.search(MATCH_TAG);

  let sentenceStart = 0;
  if (match > 0) {
    for (const boundary of text.matchAll(SENTENCE_END)) {
      const end = (boundary.index ?? 0) + boundary[0].length;
      if (end > match) {
        break;
      }
      sentenceStart = end;
    }
  }

  const head = text.slice(sentenceStart).replace(LEADING_PUNCTUATION, "");

  if (sentenceStart > 0) {
    return head;
  }

  return STARTS_LOWERCASE.test(head) ? head.replace(LEADING_WORD, "") : head;
}
