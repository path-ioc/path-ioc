# @path-ioc/unplugin

## 0.1.8

No changes in this release.

## 0.1.7

### Patch Changes

- **Features:**
  - feat: support precise multi-target subset compilation via standard glob brace expansion in `modulesPath` (e.g. `src/modules/{core,admin}`).
  - feat: intelligently strip single-element brace expansions (e.g. `src/modules/{core}`) to seamlessly patch edge-case bugs in native glob engines.
  - feat: dynamically discover and merge global type definitions from `tsconfig.*.json` `include` paths instead of hardcoded strings.

  **Fixes & Refactoring:**
  - fix: strictly validate `modulesPath` via AST regex to explicitly forbid wildcards (`*`, `?`) and nested braces, preventing catastrophic base directory collapse.
  - chore: completely decouple `@path-ioc/unplugin` from `@path-ioc/core` to eliminate CI/CD build-time circular dependencies.
  - chore: strict TypeScript refactoring to eradicate excessive `any` usage and harden internal type safety.

  **Docs:**
  - docs: update `modulesPath` API specifications and architecture manifests across all official documentation and READMEs.

## 0.1.6

### Patch Changes

- fix missing module type declaration files in modular pack distribution

## 0.1.5

### Patch Changes

- docs: replace video tags with image preview and video links in README files

## 0.1.4

### Patch Changes

- docs: sync updated READMEs and architectural documentation

## 0.1.2

### Patch Changes

- docs: standardize package documentation with comprehensive bilingual English & Chinese READMEs

## 0.1.1

### Patch Changes

- 81cb81e: feat: initial public release of Path-IoC topological dependency resolution engine
