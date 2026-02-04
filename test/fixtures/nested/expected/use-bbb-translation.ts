import { useTranslations } from "next-intl";
import type { DeepReadonly } from "ts-essentials";

type BbbDictionary = DeepReadonly<{
	b2: string;
}>;

type BbbTranslations = DeepReadonly<{
	(key: keyof BbbDictionary): string;
}>;

export function useBbbTranslations(): BbbTranslations {
	return useTranslations("bbb");
}
