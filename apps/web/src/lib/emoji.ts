const EMOJI_ONLY =
  /^[\s\p{Emoji}\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f]+$/u;

export function isEmojiOnlyMessage(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const stripped = text.replace(/\s/g, "");
  if (!stripped) return false;
  return EMOJI_ONLY.test(stripped) && /\p{Extended_Pictographic}/u.test(stripped);
}
