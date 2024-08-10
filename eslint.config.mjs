import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
	{ files: [ '**/*.js' ], languageOptions: { sourceType: 'commonjs' } },
	{
		ignores: [
			'.dev-server/**/*',
			'admin/build/**/*',
			'admin/words.js',
			'test/**/*',
			'main.test.js',
			'jeelink.js',
			'lib/**/*'
		]
	},
	{ languageOptions: { globals: globals.browser } },
	pluginJs.configs.recommended
];
