import { useTranslations } from "next-intl";
import type { DeepReadonly } from "ts-essentials";

type AaaDictionary = DeepReadonly<{
	a1: string;
	a2: string;
}>;

type AaaTranslations = DeepReadonly<{
	(key: keyof AaaDictionary): string;
}>;

export function useAaaTranslations(): AaaTranslations {
	return useTranslations("aaa");
}
