module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended"],
  rules: {
    "no-unused-vars": "off", // Turn off base rule
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-console": "off", // Allow console.log for logging
    "no-undef": "off", // TypeScript handles this
  },
  env: {
    node: true,
    es6: true,
    jest: true,
  },
  ignorePatterns: ["dist/", "node_modules/", "*.js", "*.d.ts"],
};
