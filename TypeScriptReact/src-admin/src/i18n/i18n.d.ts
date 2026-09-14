/*
 * This file loads the translation keys from `i18n/en.json` file and overrides
 * the declarations for the translation function `I18n.t` available in "@iobroker/gui-components/i18n".
 * Using these definitions, it is ensured that all used translations in the React
 * context is defined at least in the English translations file.
 * This will add no overhead in the generated code since it just reexports the
 * I18n class but with a more typed `t` function.
 */

/*
 * DO NOT add any imports or exports in this file, or it will stop working!
 */

/**
 * Available words in `i18n/en.json`.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
declare type AdminWord = keyof typeof import("./en.json");

declare module "@iobroker/gui-components/i18n/i18n" {
	/**
	 * Translate the given string to the selected language.
	 *
	 * @param word The (key) word to look up the string. Has to be defined at least in `i18n/en.json`.
	 * @param args Optional arguments that will replace the first (second, third, ...) occurence of %s
	 */
	function t(word: AdminWord, ...args: string[]): string;
}
