import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],

    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },

    settings: {
      react: {
        version: "detect", // Automatically detect React version
      },
    },

    ignores: [
      "node_modules/", // Ignore dependencies
      ".next/",        // Ignore Next.js build files
      "dist/",         // Ignore compiled output
      "public/",       // Ignore static assets
      "coverage/",     // Ignore test coverage reports
    ],

    rules: {
      "react/react-in-jsx-scope": "off", // Next.js handles React imports
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_" }], // Warn only & ignore _unused vars
      "no-undef": "off", // Ignore undefined variables
      "no-cond-assign": "warn", // Allow but warn assignments in conditions
      "no-sparse-arrays": "warn", // Warn about sparse arrays
      "no-prototype-builtins": "off", // Allow object prototype methods
      "no-empty": "warn", // Warn instead of error for empty blocks
      "no-self-assign": "warn", // Warn instead of error for self-assignment
      "no-redeclare": "warn", // Warn about redeclaring variables
      "no-fallthrough": "warn", // Warn instead of error for missing break in switch
    },
  },

  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
];
