// The public types of the package. They are type aliases rather than interfaces on
// purpose: an alias has an implicit index signature, so a parsed message stays
// assignable to `Record<string, unknown>`, which is how consumers hand it to loggers and
// storage helpers, and every optional property is declared as `T | undefined` so that the
// types also work under exactOptionalPropertyTypes. test/package-test.ts checks both.
export {};
