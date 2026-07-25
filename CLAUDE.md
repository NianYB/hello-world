# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repository contains no source code. The only tracked file besides this one is
`README` (a single line, `Hello World!`).

The commit history is that of GitHub's canonical tutorial repository `octocat/Hello-World` —
same commit SHAs, authored by The Octocat in 2011–2012, including the merge of PR #6 from
Spaceghost. None of that history is project work, so don't read intent into it.

## No build tooling exists

There is no build, test, lint, or dependency configuration of any kind, and no language
committed yet. Do not guess at commands (`npm test`, `make`, `pytest`, …) — none of them are
wired up, and running them will only produce confusing failures.

When the first real code lands, whoever adds it also picks the language and tooling. Record the
resulting build/test/lint commands in this section at that point; until then, treat its absence
as accurate rather than as something missing to be filled in.

## Conventions

`README` has no file extension. That is the upstream original, not an oversight — don't rename
it or replace it with `README.md` as a drive-by change.
