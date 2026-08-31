import type { Language, TranslationDictionary } from "../types";
import { en } from "./en";
import { ar } from "./ar";

export const translations: Record<Language, TranslationDictionary> = { en, ar };
