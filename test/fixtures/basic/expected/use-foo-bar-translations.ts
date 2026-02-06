import { useTranslations } from "next-intl";
import type { DeepReadonly } from "ts-essentials";

type FooBarDictionary = DeepReadonly<{
	foo: string;
}>;

type FooBarTranslations = DeepReadonly<{
	(key: keyof FooBarDictionary): string;
}>;

export function useFooBarTranslations(): FooBarTranslations {
	return useTranslations("fooBar");
}
