import { useTranslations } from "next-intl";
import type { DeepReadonly } from "ts-essentials";

type MixedDictionary = DeepReadonly<{
	str: string;
}>;

type MixedTranslations = DeepReadonly<{
	(key: keyof MixedDictionary): string;
}>;

export function useMixedTranslations(): MixedTranslations {
	return useTranslations("mixed");
}
