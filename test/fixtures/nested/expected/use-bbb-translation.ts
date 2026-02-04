import { useTranslations } from "next-intl";
import type { DeepReadonly } from "ts-essentials";

type BbbDictionary = DeepReadonly<{
	b1: {
		b1a: string;
		b1b: string;
	};
	b2: string;
}>;

type BbbTranslations = DeepReadonly<{
	(key: keyof BbbDictionary): string;
}>;

export function useBbbTranslations(): BbbTranslations {
	return useTranslations("bbb");
}
