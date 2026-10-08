export function containsEmoji(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (
      (codePoint >= 0x1f000 && codePoint <= 0x1faff) ||
      (codePoint >= 0x2600 && codePoint <= 0x27bf) ||
      (codePoint >= 0x2b00 && codePoint <= 0x2bff) ||
      (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
      codePoint === 0x200d ||
      codePoint === 0x20e3 ||
      codePoint === 0x00a9 ||
      codePoint === 0x00ae ||
      codePoint === 0x2122
    );
  });
}
