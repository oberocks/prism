import ruby from './prism-ruby.js';

export default /** @type {import("../types").LanguageProto} */ ({
	id: 'haml',
	require: ruby,
	optional: ['css', 'css-extras', 'coffeescript', 'erb', 'javascript', 'less', 'markdown', 'scss', 'textile'],
	grammar({ getLanguage }) {
		/* TODO
			Handle multiline code after tag
			    %foo= some |
					multiline |
					code |
		*/


		Prism.languages.haml = {
			// Multiline stuff should appear before the rest

			'multiline-comment': {
				pattern: /((?:^|\r?\n|\r)([\t ]*))(?:\/|-#).*(?:(?:\r?\n|\r)\2[\t ].+)*/,
				lookbehind: true,
				alias: 'comment'
			},

			'multiline-code': [
				{
					pattern: /((?:^|\r?\n|\r)([\t ]*)(?:[~-]|[&!]?=)).*,[\t ]*(?:(?:\r?\n|\r)\2[\t ].*,[\t ]*)*(?:(?:\r?\n|\r)\2[\t ].+)/,
					lookbehind: true,
					inside: 'ruby'
				},
				{
					pattern: /((?:^|\r?\n|\r)([\t ]*)(?:[~-]|[&!]?=)).*\|[\t ]*(?:(?:\r?\n|\r)\2[\t ].*\|[\t ]*)*/,
					lookbehind: true,
					inside: 'ruby'
				}
			],

			// See at the end of the file for known filters
			'filter': {
				pattern: /((?:^|\r?\n|\r)([\t ]*)):[\w-]+(?:(?:\r?\n|\r)(?:\2[\t ].+|\s*?(?=\r?\n|\r)))+/,
				lookbehind: true,
				inside: {
					'filter-name': {
						pattern: /^:[\w-]+/,
						alias: 'symbol'
					}
				}
			},

			'markup': {
				pattern: /((?:^|\r?\n|\r)[\t ]*)<.+/,
				lookbehind: true,
				inside: 'markup'
			},
			'doctype': {
				pattern: /((?:^|\r?\n|\r)[\t ]*)!!!(?: .+)?/,
				lookbehind: true
			},
			'tag': {
				// Allows for one nested group of braces
				pattern: /((?:^|\r?\n|\r)[\t ]*)[%.#][\w\-#.]*[\w\-](?:\([^)]+\)|\{(?:\{[^}]+\}|[^{}])+\}|\[[^\]]+\])*[\/<>]*/,
				lookbehind: true,
				inside: {
					'attributes': [
						{
							// Lookbehind tries to prevent interpolations from breaking it all
							// Allows for one nested group of braces
							pattern: /(^|[^#])\{(?:\{[^}]+\}|[^{}])+\}/,
							lookbehind: true,
							inside: 'ruby'
						},
						{
							pattern: /\([^)]+\)/,
							inside: {
								'attr-value': {
									pattern: /(=\s*)(?:"(?:\\.|[^\\"\r\n])*"|[^)\s]+)/,
									lookbehind: true
								},
								'attr-name': /[\w:-]+(?=\s*!?=|\s*[,)])/,
								'punctuation': /[=(),]/
							}
						},
						{
							pattern: /\[[^\]]+\]/,
							inside: 'ruby'
						}
					],
					'punctuation': /[<>]/
				}
			},
			'code': {
				pattern: /((?:^|\r?\n|\r)[\t ]*(?:[~-]|[&!]?=)).+/,
				lookbehind: true,
				inside: 'ruby'
			},
			// Interpolations in plain text
			'interpolation': {
				pattern: /#\{[^}]+\}/,
				inside: {
					'delimiter': {
						pattern: /^#\{|\}$/,
						alias: 'punctuation'
					},
					'ruby': {
						pattern: /[\s\S]+/,
						inside: 'ruby'
					}
				}
			},
			'punctuation': {
				pattern: /((?:^|\r?\n|\r)[\t ]*)[~=\-&!]+/,
				lookbehind: true
			}
		};

		let filter_pattern = '((?:^|\\r?\\n|\\r)([\\t ]*)):{{filter_name}}(?:(?:\\r?\\n|\\r)(?:\\2[\\t ].+|\\s*?(?=\\r?\\n|\\r)))+';

		// Non exhaustive list of available filters and associated languages
		let filters = [
			'css',
			{ filter: 'coffee', language: 'coffeescript' },
			'erb',
			'javascript',
			'less',
			'markdown',
			'ruby',
			'scss',
			'textile'
		];
		let all_filters = {};
		for (let i = 0, l = filters.length; i < l; i++) {
			var filter = filters[i];
			filter = typeof filter === 'string' ? { filter: filter, language: filter } : filter;
			if (Prism.languages[filter.language]) {
				all_filters['filter-' + filter.filter] = {
					pattern: RegExp(filter_pattern.replace('{{filter_name}}', function () { return filter.filter; })),
					lookbehind: true,
					inside: {
						'filter-name': {
							pattern: /^:[\w-]+/,
							alias: 'symbol'
						},
						'text': {
							pattern: /[\s\S]+/,
							alias: [filter.language, 'language-' + filter.language],
							inside: Prism.languages[filter.language]
						}
					}
				};
			}
		}

		Prism.languages.insertBefore('haml', 'filter', all_filters);
	}
});
