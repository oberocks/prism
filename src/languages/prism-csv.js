export default /** @type {import("../types").LanguageProto} */ ({
	id: 'csv',
	grammar() {
		// https://tools.ietf.org/html/rfc4180

		return {
			'value': /[^\r\n,"]+|"(?:[^"]|"")*"(?!")/,
			'punctuation': /,/
		};
	}
});
