import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Katman sınırları. Bağımlılık yönü tek yönlüdür:
 *   app -> features -> server/services -> server/repositories -> server/db
 * Ters yönde import etmek hatadır. Kural burada yaşar, testi
 * tests/architecture/layers.test.ts içindedir.
 */
const deny = (patterns, message) => ({
  rules: {
    "no-restricted-imports": [
      "error",
      { patterns: patterns.map((group) => ({ group: [group], message })) },
    ],
  },
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    files: ["src/server/repositories/**/*.ts"],
    ...deny(
      ["@/server/services/*", "@/features/*", "@/app/*", "react", "react-dom"],
      "Repository katmanı yalnızca @/server/db ve @/lib kullanabilir.",
    ),
  },
  {
    files: ["src/server/services/**/*.ts"],
    ...deny(
      ["@/app/*", "@/features/*", "react", "react-dom"],
      "Servis katmanı arayüz bilmez.",
    ),
  },
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    ...deny(
      ["@/server/*", "@/features/*", "@/app/*"],
      "lib katmanı saf yardımcılardan oluşur; sunucuya bakamaz.",
    ),
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    ...deny(
      ["@/server/repositories/*"],
      "Arayüz repository çağırmaz, servis çağırır.",
    ),
  },

  /**
   * Kullanıcıya görünen her metin src/lib/copy içinden gelir.
   * Bileşende düz metin yazmak, sözlük denetiminin atlanması demektir.
   */
  {
    files: ["src/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": [
        "error",
        {
          noStrings: true,
          allowedStrings: ["·", "→", "↑", "↓", "●", "⚠", "%", "/", "—"],
          ignoreProps: true,
        },
      ],
    },
  },

  // Testler gerçek metinleri doğrular; düz metin yasağı onlara uygulanmaz.
  {
    files: ["src/**/*.test.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    rules: {
      "react/jsx-no-literals": "off",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
