# Installation

## Prerequisites

- **Node.js 20.19.0 or higher** — Check your version: `node --version`

## GitHub Install

Install directly from this repository:

```bash
npm install -g git+https://github.com/cp-yu/opsx.git
```

If you prefer another package manager, use the same Git URL syntax it supports.

This repository builds correctly during Git installs because the package `prepare` step runs `node build.js` directly instead of requiring `pnpm`.

## Nix

Run OpenSpec directly without installation:

```bash
nix run github:cp-yu/opsx -- init
```

Or install to your profile:

```bash
nix profile install github:cp-yu/opsx
```

Or add to your development environment in `flake.nix`:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    openspec.url = "github:cp-yu/opsx";
  };

  outputs = { nixpkgs, openspec, ... }: {
    devShells.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.mkShell {
      buildInputs = [ openspec.packages.x86_64-linux.default ];
    };
  };
}
```

## Verify Installation

```bash
openspec --version
```

## Next Steps

After installing, initialize OpenSpec in your project:

```bash
cd your-project
openspec init
```

See [Getting Started](getting-started.md) for a full walkthrough.
