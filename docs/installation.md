# Installation

## Prerequisites

- **Node.js 20.19.0 or higher** — Check your version: `node --version`

## GitHub Release Install

Install the packaged tarball from a GitHub Release:

```bash
npm install -g https://github.com/cp-yu/opsx/releases/download/v1.2.0-cpyu.3/fission-ai-openspec-1.2.0-cpyu.3.tgz
```

Replace `1.2.0-cpyu.3` with the version you want to install.

This installs a prebuilt package asset, so users do not need a Git dependency build during installation.

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
