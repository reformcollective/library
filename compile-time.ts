export function compileTime<T>(getValue: () => T): T {
	return getValue()
}
