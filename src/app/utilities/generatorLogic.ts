export const CHARACTER_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  special: "!@#$%^&*()_+~`|}{[]:;?><,./-=",
} as const;

export type CharacterOption = keyof typeof CHARACTER_SETS;
export type CharacterOptions = Record<CharacterOption, boolean>;
export type RandomInt = (upperBound: number) => number;

function selectedSets(options: CharacterOptions): string[] {
  return (Object.keys(CHARACTER_SETS) as CharacterOption[])
    .filter((key) => options[key])
    .map((key) => CHARACTER_SETS[key]);
}

function randomCharacter(characters: string, randomInt: RandomInt): string {
  return characters[randomInt(characters.length)];
}

function secureShuffle(values: string[], randomInt: RandomInt): string[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function buildPassword(length: number, options: CharacterOptions, randomInt: RandomInt): string {
  const sets = selectedSets(options);
  if (sets.length === 0) throw new Error("At least one character set is required");
  if (length < sets.length) throw new Error("Length must fit every enabled character set");
  const characters = sets.map((set) => randomCharacter(set, randomInt));
  const pool = sets.join("");
  while (characters.length < length) characters.push(randomCharacter(pool, randomInt));
  return secureShuffle(characters, randomInt).join("");
}

export function buildRandomString(length: number, options: CharacterOptions, randomInt: RandomInt): string {
  return buildPassword(length, options, randomInt);
}

function titleCase(word: string): string {
  return word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : word;
}

export function formatPassphrase(
  words: string[], separator: string, capitalize: boolean, includeNumber: boolean, randomInt: RandomInt,
): string {
  const formatted = capitalize ? words.map(titleCase) : words.map((word) => word.toLowerCase());
  if (includeNumber) formatted.push(String(randomInt(10)));
  return formatted.join(separator);
}

export function formatWordUsername(
  words: string[], separator: string, capitalize: boolean, includeNumber: boolean, randomInt: RandomInt,
): string {
  const formatted = capitalize ? words.map(titleCase) : words.map((word) => word.toLowerCase());
  if (includeNumber) formatted.push(String(randomInt(1000)));
  return formatted.join(separator);
}

export function toggleCharacterOption(
  options: CharacterOptions,
  key: CharacterOption,
): { options: CharacterOptions; blocked: boolean } {
  const next = { ...options, [key]: !options[key] };
  if (!Object.values(next).some(Boolean)) return { options, blocked: true };
  return { options: next, blocked: false };
}

export function getGeneratorStrength(length: number, enabledSetCount: number): { label: string; level: number } {
  if (length >= 20 && enabledSetCount >= 3) return { label: "Excellent", level: 4 };
  if (length >= 14 && enabledSetCount >= 3) return { label: "Strong", level: 3 };
  if (length >= 10 && enabledSetCount >= 2) return { label: "Good", level: 2 };
  return { label: "Basic", level: 1 };
}
