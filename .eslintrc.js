const OFF = 0;

module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "plugin:@typescript-eslint/recommended",
  ],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module" 
  },
  rules: {
    "@typescript-eslint/no-var-requires": OFF,
    "@typescript-eslint/no-explicit-any": OFF,
    "@typescript-eslint/interface-name-prefix" : OFF,
    "@typescript-eslint/no-non-null-assertion": OFF,
    "@typescript-eslint/camelcase": OFF,
  }
};
