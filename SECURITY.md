# Security policy

## Supported versions

Security updates are applied to the **default branch** (`main`) of [mhusam/specter](https://github.com/mhusam/specter). There are no separate long-term support release branches today.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for undisclosed security problems.

1. Use **[GitHub Security Advisories](https://github.com/mhusam/specter/security/advisories/new)** to report a vulnerability privately (repository **Security** tab → **Report a vulnerability**).
2. If you cannot use Advisories, open a **draft** issue with minimal detail and ask the maintainers to enable a private channel, or contact the repository owner through their GitHub profile.

Include steps to reproduce, affected versions or commit, and impact if you can. You should receive an acknowledgment within a reasonable time; maintainers may ask follow-up questions privately.

## Scope notes

- **Ollama** and **PostgreSQL** run on your infrastructure; keep them patched and not exposed to the public internet without TLS and access controls.
- **Adminer** in the development Docker stack is not intended for production exposure (see README).

Thank you for helping keep Specter users safe.
