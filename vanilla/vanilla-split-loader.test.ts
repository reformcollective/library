import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type {
	TurboLoaderContext,
	TurboLoaderOptions,
} from "@vanilla-extract/turbopack-plugin"
import ts from "typescript"
import { assert, describe, expect, it, vi } from "vitest"
import { analyzeDependencies } from "./dependency-graph.ts"
import { default as vanillaSplitLoader } from "./vanilla-split-loader.ts"

/**
 * Checks for duplicate identifier declarations in the code.
 * This catches bugs where we import a name AND define it locally.
 */
function findDuplicateIdentifiers(
	code: string,
	filename = "test.tsx",
): string[] {
	const sourceFile = ts.createSourceFile(
		filename,
		code,
		ts.ScriptTarget.Latest,
		true,
		filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	)

	const declaredNames = new Map<string, number>()
	const duplicates: string[] = []

	for (const stmt of sourceFile.statements) {
		// Track imports
		if (ts.isImportDeclaration(stmt) && stmt.importClause) {
			const clause = stmt.importClause
			if (clause.name) {
				const name = clause.name.text
				declaredNames.set(name, (declaredNames.get(name) ?? 0) + 1)
			}
			if (clause.namedBindings) {
				if (ts.isNamedImports(clause.namedBindings)) {
					for (const el of clause.namedBindings.elements) {
						const name = el.name.text
						declaredNames.set(name, (declaredNames.get(name) ?? 0) + 1)
					}
				} else if (ts.isNamespaceImport(clause.namedBindings)) {
					const name = clause.namedBindings.name.text
					declaredNames.set(name, (declaredNames.get(name) ?? 0) + 1)
				}
			}
		}

		// Track variable declarations
		if (ts.isVariableStatement(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				if (ts.isIdentifier(decl.name)) {
					const name = decl.name.text
					declaredNames.set(name, (declaredNames.get(name) ?? 0) + 1)
				}
			}
		}

		// Track function declarations
		if (ts.isFunctionDeclaration(stmt) && stmt.name) {
			const name = stmt.name.text
			declaredNames.set(name, (declaredNames.get(name) ?? 0) + 1)
		}

		// Track class declarations
		if (ts.isClassDeclaration(stmt) && stmt.name) {
			const name = stmt.name.text
			declaredNames.set(name, (declaredNames.get(name) ?? 0) + 1)
		}
	}

	for (const [name, count] of declaredNames) {
		if (count > 1) {
			duplicates.push(`'${name}' is defined ${count} times`)
		}
	}

	return duplicates
}

/**
 * Asserts that the generated code has no duplicate identifiers.
 */
function expectValidTypeScript(code: string, filename = "test.tsx") {
	const duplicates = findDuplicateIdentifiers(code, filename)
	if (duplicates.length > 0) {
		throw new Error(
			`Generated code has duplicate identifiers:\n${duplicates.join("\n")}\n\nCode:\n${code}`,
		)
	}
}

// Mock the turboLoader to return a simple passthrough
vi.mock("@vanilla-extract/turbopack-plugin", () => ({
	default: {
		default: async function (this: TurboLoaderContext<TurboLoaderOptions>) {
			// Read the temp file and return it as-is (simulating VE processing)
			const content = await fs.readFile(this.resourcePath, "utf-8")
			return content
		},
	},
}))

/**
 * Creates a mock TurboLoaderContext for testing
 */
function createMockContext(
	resourcePath: string,
	rootContext: string,
): TurboLoaderContext<TurboLoaderOptions> {
	return {
		resourcePath,
		rootContext,
		getOptions: () => ({
			identifiers: "debug" as const,
			outputCss: null,
			nextEnv: null,
		}),
		getResolve: () => async (_context: string, request: string) => request,
		fs: fs as unknown as TurboLoaderContext<TurboLoaderOptions>["fs"],
	} as TurboLoaderContext<TurboLoaderOptions>
}

class TempDir {
	private path = new Promise<string>((resolve) =>
		fs.mkdtemp(path.join(os.tmpdir(), "vanilla-split-test")).then((tmpDir) =>
			fs
				.writeFile(
					path.join(tmpDir, "package.json"),
					JSON.stringify({
						name: "vanilla-split-test",
					}),
				)
				.then(() => resolve(tmpDir)),
		),
	)

	async getPath(): Promise<string> {
		return await this.path
	}

	[Symbol.asyncDispose]() {
		return this.path.then((path) => fs.rm(path, { recursive: true }))
	}
}

describe.concurrent("vanilla-split-loader", () => {
	describe("passthrough behavior", () => {
		it("should pass through .css.ts files unchanged", async () => {
			await using tmpDir = new TempDir()
			const source = `import { style } from "@vanilla-extract/css"\nexport const button = style({ color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "test.css.ts"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expect(result).toBe(source)
		})

		it("should pass through library/styled/ files unchanged", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"\nexport const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "library/styled/helpers.ts"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expect(result).toBe(source)
		})

		it("should pass through files without tracked imports", async () => {
			await using tmpDir = new TempDir()
			const source = `import React from "react"\nconst x = 1\nexport function Component() { return <div>{x}</div> }`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expect(result).toBe(source)
		})
	})

	describe("basic splitting", () => {
		it("should move styled component to virtual module", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
export const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			// Should import Button from a data URL (virtual module)
			expect(result).toContain("data:text/javascript;base64,")
			expect(result).toContain("import { Button }")
			// Should re-export Button
			expect(result).toContain("export { Button }")
		})

		it("should move keyframes to virtual module", async () => {
			await using tmpDir = new TempDir()
			const source = `import { keyframes } from "library/styled/alpha"
export const fadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("data:text/javascript;base64,")
			expect(result).toContain("import { fadeIn }")
		})
	})

	describe("directive handling", () => {
		it("should preserve 'use client' directive at top of file", async () => {
			await using tmpDir = new TempDir()
			const source = `"use client"
import { styled } from "library/styled/alpha"
export const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			// Directive should be first
			const lines = result
				.split("\n")
				.map((l: string) => l.trim())
				.filter((l: string) => l)
			expect(lines[0]).toBe('"use client";')
		})

		it("should place virtual imports after directives and existing imports", async () => {
			await using tmpDir = new TempDir()
			const source = `"use client"
import React from "react"
import { styled } from "library/styled/alpha"
export const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			const lines = result
				.split("\n")
				.map((l: string) => l.trim())
				.filter((l: string) => l)

			const directiveIdx = lines.findIndex((l: string) =>
				l.includes('"use client"'),
			)
			const reactImportIdx = lines.findIndex((l: string) =>
				l.includes('from "react"'),
			)
			const virtualImportIdx = lines.findIndex((l: string) =>
				l.includes("data:text/javascript"),
			)

			expect(directiveIdx).toBeLessThan(reactImportIdx)
			expect(reactImportIdx).toBeLessThan(virtualImportIdx)
		})
	})

	describe("module-level statements", () => {
		it("should preserve if statements at module scope", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"

const isBrowser = typeof window !== "undefined"
if (isBrowser) {
	console.log("browser only")
}

export const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("if (isBrowser)")
		})

		it("should preserve for loops at module scope", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"

for (let i = 0; i < 3; i++) {
	console.log(i)
}

export const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("for (let i = 0;")
		})
	})

	describe("shared dependencies", () => {
		it("should keep shared variables in original when used by both styled and runtime", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
import { eases } from "library/eases"

const DURATION = 0.3
const BUTTON_EASE = eases.out

export const Button = styled("button", {
	transition: \`all \${DURATION}s \${BUTTON_EASE}\`
})

export function animate() {
	return { duration: DURATION, ease: BUTTON_EASE }
}`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			// DURATION and BUTTON_EASE should stay in original because animate() uses them
			expect(result).toContain("const DURATION")
			expect(result).toContain("const BUTTON_EASE")
			// eases import should also stay
			expect(result).toContain('from "library/eases"')
		})

		it("should move dependency to virtual when only used by tainted nodes", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"

const STYLE_CONST = "red"

export const Button = styled("button", { color: STYLE_CONST })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			// STYLE_CONST should NOT be in original since only Button uses it
			expect(result).not.toContain("const STYLE_CONST")
		})

		it("should preserve external component import for styled(Component)", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
import { ExternalComponent } from "external-lib"

export const Styled = styled(ExternalComponent, { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			// The external import MUST be preserved in original for withComponent
			expect(result).toContain('from "external-lib"')
			expect(result).toContain("ExternalComponent")
			expect(result).toContain("withComponent(ExternalComponent")
		})

		it("should preserve external component import with type cast", async () => {
			await using tmpDir = new TempDir()
			// This mimics the SanityImage pattern: styled(Component as typeof Component<"img">, ...)
			const source = `import { styled } from "library/styled/alpha"
import { SanityImage } from "sanity-image"

const DefaultSanityImage = styled(SanityImage as typeof SanityImage<"img">, { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			// The external import MUST be preserved in original for withComponent
			expect(result).toContain('from "sanity-image"')
			expect(result).toContain("SanityImage")
			expect(result).toContain("withComponent(SanityImage")
		})
	})

	describe("type declarations", () => {
		it("should preserve type aliases", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"

type ButtonVariant = "primary" | "secondary"

export const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("type ButtonVariant")
		})

		it("should preserve interfaces", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"

interface ButtonProps {
	variant: string
}

export const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("interface ButtonProps")
		})

		it("should preserve enums", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"

enum ButtonSize { Small, Medium, Large }

export const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("enum ButtonSize")
		})
	})

	describe("export declarations", () => {
		it("should preserve re-export declarations", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
export { something } from "./other"
export const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain('export { something } from "./other"')
		})

		it("should re-export tainted exported variables", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
export const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("export { Button }")
		})
	})

	describe("styled(Component) handling", () => {
		it("should handle chained styled components", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"

const Something = styled("div", { color: "red" })
const SomethingElse = styled(Something, { color: "blue" })
const SomethingElseElse = styled(SomethingElse, { color: "green" })

export { Something, SomethingElse, SomethingElseElse }`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			// SomethingElse and SomethingElseElse should have wrappers since they extend components
			expect(result).toContain("SomethingElse___raw")
			expect(result).toContain("SomethingElseElse___raw")
			expect(result).toContain("withComponent")

			// Key bug fix: SomethingElse should NOT be imported from virtual module
			// because it's created in original via withComponent(Something, SomethingElse___raw)
			// Extract the import statement from the data URL
			const importMatch = result.match(
				/import \{([^}]+)\} from "data:text\/javascript/,
			)
			expect(importMatch).toBeTruthy()
			const importedNames = importMatch?.[1]?.split(",").map((s) => s.trim())

			// Should import Something (base, string tag - moved to virtual)
			expect(importedNames).toContain("Something")
			// Should import the ___raw versions
			expect(importedNames).toContain("SomethingElse___raw")
			expect(importedNames).toContain("SomethingElseElse___raw")
			// Should NOT import SomethingElse or SomethingElseElse (they're created in original)
			expect(importedNames).not.toContain("SomethingElse")
			expect(importedNames).not.toContain("SomethingElseElse")

			// Check the virtual module has all the style definitions
			const preProcessPath = path.join(
				await tmpDir.getPath(),
				".next/debug/pre-process/app/test.css.tsx",
			)
			const virtualModule = await fs.readFile(preProcessPath, "utf-8")

			// Virtual should have Something (string tag, moved entirely)
			expect(virtualModule).toContain("Something")
			// Virtual should have the raw versions for component-based styled
			expect(virtualModule).toContain("SomethingElse___raw")
			expect(virtualModule).toContain("SomethingElseElse___raw")
		})

		it("should split styled(Component) into raw + wrapper", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
import BaseButton from "./BaseButton"

export const Button = styled(BaseButton, { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			// Original should have withComponent wrapper
			expect(result).toContain("withComponent")
			expect(result).toContain("Button___raw")
		})

		it("should keep base component import in original", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
import BaseButton from "./BaseButton"

export const Button = styled(BaseButton, { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			// BaseButton import should stay in original
			expect(result).toContain('import BaseButton from "./BaseButton"')
		})

		it("should handle styled(Menu.Trigger) compound component", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
import * as Menu from "@radix-ui/react-menu"

const StyledMenuTrigger = styled(Menu.Trigger, { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("withComponent")
			expect(result).toContain("StyledMenuTrigger___raw")
			expect(result).toContain("Menu.Trigger")
			expect(result).toContain('from "@radix-ui/react-menu"')
		})

		it("should handle styled(Menu.Trigger) with type assertion", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
import * as Menu from "@radix-ui/react-menu"

const StyledMenuTrigger = styled(Menu.Trigger, { color: "red" }) as typeof Menu.Trigger`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("withComponent")
			expect(result).toContain("StyledMenuTrigger___raw")
			expect(result).toContain("Menu.Trigger")
			expect(result).toContain("as typeof Menu.Trigger")
			expect(result).toContain('from "@radix-ui/react-menu"')
		})

		it("should handle styled(Thing.Menu.Trigger) with type assertion", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
import * as Thing from "./thing"

const StyledThingMenuTrigger = styled(Thing.Menu.Trigger, { color: "red" }) as typeof Thing.Menu.Trigger`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("withComponent")
			expect(result).toContain("StyledThingMenuTrigger___raw")
			expect(result).toContain("Thing.Menu.Trigger")
			expect(result).toContain("as typeof Thing.Menu.Trigger")
			expect(result).toContain('from "./thing"')
		})

		it("should handle styled(Thing.Menu.Trigger) nested compound component", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
import * as Thing from "./thing"

const StyledThingMenuTrigger = styled(Thing.Menu.Trigger, { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("withComponent")
			expect(result).toContain("StyledThingMenuTrigger___raw")
			expect(result).toContain("Thing.Menu.Trigger")
			expect(result).toContain('from "./thing"')
		})

		it("should handle StyledInput pattern: styled(Field.Control, f.responsive(css)) as typeof Field.Control", async () => {
			await using tmpDir = new TempDir()
			const source = `"use client";

import { css, f, styled } from "library/styled/alpha";
import { colors } from "app/styles/colors.css";
import { Field } from "@base-ui/react/field";

function FormStep() {
  return (
    <Field.Root>
      <StyledInput type="text" placeholder="test" />
    </Field.Root>
  );
}

const StyledInput = styled(Field.Control, {
  base: [
    f.responsive(css\`
      color: \${colors.pureWhite};
    \`),
  ],
}) as typeof Field.Control;`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/form-step.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("withComponent")
			expect(result).toContain("StyledInput___raw")
			expect(result).toContain("Field.Control")
			expect(result).toContain("as typeof Field.Control")
			expect(result).toContain('from "@base-ui/react/field"')
			expect(result).toContain("<StyledInput")
			// styled/css/f/colors move to virtual; Field stays in original for withComponent
			expect(result).not.toContain('from "library/styled/alpha"')
		})
	})

	describe("error handling", () => {
		it("should error when style functions used in function body", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"

function createButton() {
	return styled("button", { color: "red" })
}`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			await expect(vanillaSplitLoader.call(ctx, source)).rejects.toThrow(
				/Cannot use style functions inside function\/class body/,
			)
		})

		it("should error when style functions used in arrow function", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"

const createButton = () => styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			await expect(vanillaSplitLoader.call(ctx, source)).rejects.toThrow(
				/Cannot use style functions inside function\/class body/,
			)
		})

		it("should allow style functions in library/styled/ files", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"

function createButton() {
	return styled("button", { color: "red" })
}`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "library/styled/helpers.ts"),
				await tmpDir.getPath(),
			)

			// Should not throw - passthrough for library/styled
			const result = await vanillaSplitLoader.call(ctx, source)
			expect(result).toBe(source)
		})
	})

	describe("vanilla-extract/css imports", () => {
		it("should track style from @vanilla-extract/css", async () => {
			await using tmpDir = new TempDir()
			const source = `import { style } from "@vanilla-extract/css"
export const button = style({ color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("data:text/javascript;base64,")
			expect(result).toContain("import { button }")
		})

		it("should track createVar from @vanilla-extract/css", async () => {
			await using tmpDir = new TempDir()
			const source = `import { createVar } from "@vanilla-extract/css"
export const colorVar = createVar()`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			expect(result).toContain("data:text/javascript;base64,")
			expect(result).toContain("import { colorVar }")
		})

		it("should track globalStyle as expression statement", async () => {
			await using tmpDir = new TempDir()
			const source = `import { globalStyle, style } from "@vanilla-extract/css"
globalStyle("html, body", { margin: 0 })
export const button = style({ color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			// globalStyle is a side-effect that moves to virtual along with other styles
			expect(result).toContain("data:text/javascript;base64,")
			expect(result).toContain("import { button }")
		})
	})

	describe("property access false dependency bug", () => {
		it("collectDependencies should not treat property-name identifiers in PropertyAccessExpression as standalone refs", () => {
			// Bug: collectDependencies uses ts.forEachChild to walk ALL identifiers,
			// including the `.name` side of a PropertyAccessExpression. So for
			// `styled(Combobox.Input, ...)`, both `Combobox` and `Input` are visited.
			// If `Input` happens to be an imported name, it gets added to dependsOn
			// of the styled component — incorrectly tainting it and dragging it into
			// the virtual CSS module.
			const source = `import * as Combobox from "@headlessui/react"
import { Input } from "./input-component"
import { styled } from "library/styled/alpha"

const StyledComboboxInput = styled(Combobox.Input, { color: "red" })`

			const graph = analyzeDependencies(source)
			const node = graph.nodes.get("StyledComboboxInput")

			assert(node !== undefined)
			// `Input` is only a property name here — it is NOT a reference to the
			// imported `Input`. It must NOT appear in dependsOn.
			expect(node.dependsOn).not.toContain("Input")
			// The root of the property access and styled itself must still be deps.
			expect(node.dependsOn).toContain("Combobox")
			expect(node.dependsOn).toContain("styled")
		})

		it("should not pull a same-named import into the virtual module via property access", async () => {
			// Observable symptom of the bug at the loader level: `Input` (imported from
			// a separate path) gets dragged into the virtual .css.ts module because its
			// name coincidentally matches the property in `Combobox.Input`. The virtual
			// module then tries to evaluate Input.tsx in a .css.ts context and throws.
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
import * as Combobox from "@headlessui/react"
import { Input } from "./input-component"

const StyledComboboxInput = styled(Combobox.Input, { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			const result = await vanillaSplitLoader.call(ctx, source)
			expectValidTypeScript(result)

			const preProcessPath = path.join(
				await tmpDir.getPath(),
				".next/debug/pre-process/app/test.css.tsx",
			)
			const virtualModule = await fs.readFile(preProcessPath, "utf-8")

			// The virtual module must NOT import Input — it's referenced only as a
			// property name (Combobox.Input) and has nothing to do with CSS.
			expect(virtualModule).not.toContain("input-component")
			expect(virtualModule).not.toMatch(/import\s*\{[^}]*\bInput\b/)

			// The Input import must remain in the original file, not be moved to virtual.
			expect(result).toContain('from "./input-component"')
		})
	})

	describe("debug output", () => {
		it("should write pre-process and final debug files", async () => {
			await using tmpDir = new TempDir()
			const source = `import { styled } from "library/styled/alpha"
export const Button = styled("button", { color: "red" })`
			const ctx = createMockContext(
				path.join(await tmpDir.getPath(), "app/test.tsx"),
				await tmpDir.getPath(),
			)

			await vanillaSplitLoader.call(ctx, source)

			// Check debug files exist
			const preProcessPath = path.join(
				await tmpDir.getPath(),
				".next/debug/pre-process/app/test.css.tsx",
			)
			const finalPath = path.join(
				await tmpDir.getPath(),
				".next/debug/final/app/test.tsx",
			)

			await expect(fs.access(preProcessPath)).resolves.toBeUndefined()
			await expect(fs.access(finalPath)).resolves.toBeUndefined()
		})
	})
})
