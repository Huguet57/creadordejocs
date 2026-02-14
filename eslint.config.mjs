import eslintPluginTs from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "**/*.d.ts"]
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.eslint.json"
      }
    },
    plugins: {
      "@typescript-eslint": eslintPluginTs
    },
    rules: {
      ...eslintPluginTs.configs["recommended-type-checked"].rules,
      ...eslintPluginTs.configs["stylistic-type-checked"].rules,
      "@typescript-eslint/consistent-type-definitions": ["error", "type"]
    }
  },
  eslintConfigPrettier
];
