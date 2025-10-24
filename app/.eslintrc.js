module.exports = {
  root: true,
  extends: ["@react-native-community", "eslint:recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "react/react-in-jsx-scope": "off"
  }
};
