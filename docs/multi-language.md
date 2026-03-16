# Multi-Language Guide

Configure OpenSpec to generate artifacts in languages other than English.

## Quick Setup

Set `docLanguage` in your `openspec/config.yaml`:

```yaml
schema: spec-driven
docLanguage: pt-BR

context: |
  Tech stack: TypeScript, React, Node.js
```

That localizes natural-language prose in generated OpenSpec artifacts. Template headings, IDs, schema keys, BDD keywords, file paths, commands, and code identifiers remain unchanged.

## Language Examples

### Portuguese (Brazil)

```yaml
docLanguage: pt-BR
```

### Spanish

```yaml
docLanguage: es
```

### Chinese (Simplified)

```yaml
docLanguage: zh-CN
```

### Japanese

```yaml
docLanguage: ja
```

### French

```yaml
docLanguage: fr
```

### German

```yaml
docLanguage: de
```

## Tips

### Handle Technical Terms

Decide how to handle technical terminology:

```yaml
docLanguage: ja

context: |
  Keep technical terms like "API", "REST", and "GraphQL" in English.
```

### Combine with Other Context

Language settings work alongside your other project context:

```yaml
schema: spec-driven
docLanguage: pt-BR

context: |
  Tech stack: TypeScript, React 18, Node.js 20
  Database: PostgreSQL with Prisma ORM
```

## Verification

To verify your language config is working:

```bash
# Check the instructions and generated workflow guidance
openspec instructions proposal --change my-change

# Agents should read openspec/config.yaml and apply docLanguage to artifact prose
```

## Related Documentation

- [Customization Guide](./customization.md) - Project configuration options
- [Workflows Guide](./workflows.md) - Full workflow documentation
