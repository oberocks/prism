import { assert } from 'chai';
import { noop, toArray } from '../src/shared/util';
import { createInstance, getComponent, getLanguageIds } from './helper/prism-loader';
import { prettyprint } from './helper/token-stream-transformer';


// This is where you can exclude a language from the identifier test.
//
// To exclude a language to the `testOptions` variable and add your language and the identifier types it should
// excluded from. All languages opt-in for all identifier types by default, so you have to explicitly disable each type
// you want to disable by setting it to `false`.
// Also add a small comment explaining why the language was excluded.
//
// The actual identifiers for all identifier types are defined in the `identifiers` variable.

/**
 * @type {Partial<Record<string, IdentifierTestOptions>>}
 *
 * @typedef IdentifierTestOptions
 * @property {boolean} [word=true]
 * @property {boolean} [number=true]
 * @property {boolean} [template=true]
 */
const testOptions = {
	// all of these have a special syntax for tokens of the form __something__
	'asciidoc': {
		template: false
	},
	'markdown': {
		template: false
	},
	'textile': {
		template: false
	},

	'false': {
		word: false,
		template: false
	},
	// Hoon uses _ in its keywords
	'hoon': {
		word: false,
		template: false
	},

	// LilyPond doesn't tokenize based on words
	'lilypond': {
		word: false,
		number: false,
		template: false,
	},

	// Nevod uses underscore symbol as operator and allows hyphen to be part of identifier
	'nevod': {
		word: false,
		template: false,
	},

	// METAFONT has a special scheme for variable names with tags, suffixes and subscripts
	'metafont': {
		word: false,
		template: false,
	},
};

/** @type {Record<keyof IdentifierTestOptions, string[]>} */
const identifiers = {
	word: [
		'abc',
		'word',
		'foo1',
		'foo123',
		'foo123bar',
		'foo_123',
		'foo_123_bar',
	],
	number: [
		'0',
		'1',
		'9',
		'123',
		'123456789',
	],
	template: [
		'__PHP0__',
		'__LANG0__',
		'__LANG123__',
		'___PLACEHOLDER_0___',
		'___PLACEHOLDER_123___',
	],
};


// Below is the implementation of the test.
// If you only came here to exclude a language, you won't find anything below.

for (const lang of getLanguageIds()) {
	describe(`Test '${lang}'`, async () => {
		const Prism = await createInstance(lang);
		testLiterals(Prism, lang);
	});


	describe(`Patterns of '${lang}' with optional dependencies`, async () => {
		const component = await getComponent(lang);
		const optional = toArray(component.optional);

		if (optional.length === 0) {
			it('no optional dependencies', noop);
		} else {
			const Prism = await createInstance([lang, ...optional]);
			testLiterals(Prism, lang);
		}
	});
}

/**
 * @param {string} lang
 * @returns {IdentifierTestOptions}
 */
function getOptions(lang) {
	return testOptions[lang] || {};
}

/**
 * @param {string | Token | (string | Token)[]} token
 * @returns {boolean}
 *
 * @typedef Token
 * @property {string} type
 * @property {string | Token | (string | Token)[]} content
 */
function isNotBroken(token) {
	if (typeof token === 'string') {
		return true;
	} else if (Array.isArray(token)) {
		return token.length === 1 && isNotBroken(token[0]);
	} else {
		return isNotBroken(token.content);
	}
}

/**
 * Tests all patterns in the given Prism instance.
 *
 * @param {import('../src/core/prism').Prism} Prism
 * @param {string} lang
 */
function testLiterals(Prism, lang) {

	/**
	 * @param {string[]} identifierElements
	 * @param {keyof IdentifierTestOptions} identifierType
	 */
	function matchNotBroken(identifierElements, identifierType) {
		for (const id of Prism.components['entries'].keys()) {
			const grammar = Prism.components.getLanguage(id);
			if (!grammar) {
				continue;
			}

			const options = getOptions(id);
			if (options[identifierType] === false) {
				continue;
			}

			for (const ident of identifierElements) {
				const tokens = Prism.tokenize(ident, grammar);

				if (!isNotBroken(tokens)) {
					assert.fail(
						`${id}: Failed to tokenize the ${identifierType} '${ident}' as one or no token.\n` +
						'Actual token stream:\n\n' +
						prettyprint(tokens) +
						'\n\n' +
						'How to fix this:\n' +
						'If your language failed any of the identifier tests then some patterns in your language can break identifiers. ' +
						'An identifier is broken if it is split into two different token (e.g. the identifier \'foo123\' (this could be a variable name) but \'123\' is tokenized as a number). ' +
						'This is usually a bug and means that some patterns need more boundary checking.\n' +
						'This test defines an identifier as /[A-Za-z_][A-Za-z_0-9]*/ so you can use \\b boundary assertions.\n\n' +
						'If the syntactic concept of an identifier is not applicable to your language, you can exclude your language from this test (or parts of it). ' +
						'Open \'' + __filename + '\' and follow the instructions to exclude a language. ' +
						'(This is usually not what you should do. Only very few language do not have the concept of identifiers.)'
					);
				}
			}
		}
	}


	const options = getOptions(lang);
	for (const key in identifiers) {
		const identifierType = /** @type {keyof IdentifierTestOptions} */ (key);
		const element = identifiers[identifierType];
		if (options[identifierType] !== false) {
			it(`- should not break ${identifierType} identifiers`, () => {
				matchNotBroken(element, identifierType);
			});
		}
	}
}
