import { config as defaultConfig } from '@epic-web/config/eslint'

/** @type {import("eslint").Linter.Config} */
export default [
	...defaultConfig,
	{
		ignores: [
			'remix.init',
			'public',
			'build',
			'node_modules',
			'package-lock.json',
		],
	},
	{
		rules: {
			'no-unused-vars': ['error', { ignoreRestSiblings: true }],
		},
	},
]
