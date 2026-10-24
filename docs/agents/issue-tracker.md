# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues on `grassroots-headquarters/my-builder-app`.

**Use the REST API through `gh api`.** GraphQL is blocked in Claude Code sessions, so `gh issue create`, `gh issue list` and `gh issue view` fail there. They work fine on a normal machine.

## Conventions

- **Create an issue**: `gh api repos/grassroots-headquarters/my-builder-app/issues -f title="..." -F body=@body.md -f "labels[]=ready-for-agent"`
- **Read an issue**: `gh api repos/grassroots-headquarters/my-builder-app/issues/<n>` and `gh api repos/grassroots-headquarters/my-builder-app/issues/<n>/comments`
- **List issues**: `gh api "repos/grassroots-headquarters/my-builder-app/issues?state=open&labels=<label>" --jq '[.[] | select(.pull_request == null) | {number, title, labels: [.labels[].name]}]'`
- **Comment on an issue**: `gh api repos/grassroots-headquarters/my-builder-app/issues/<n>/comments -f body="..."`
- **Apply a label**: `gh api repos/grassroots-headquarters/my-builder-app/issues/<n>/labels -f "labels[]=<label>"`; **remove**: `gh api -X DELETE repos/grassroots-headquarters/my-builder-app/issues/<n>/labels/<label>`
- **Close**: `gh api -X PATCH repos/grassroots-headquarters/my-builder-app/issues/<n> -f state=closed` (comment first if needed)

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read the issue and its comments with the REST calls above.

## Blocking edges

Use GitHub's native issue dependencies: `gh api --method POST repos/grassroots-headquarters/my-builder-app/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where the database id comes from `gh api repos/grassroots-headquarters/my-builder-app/issues/<n> --jq .id`. If that isn't available, fall back to a `Blocked by: #<n>` line at the top of the issue body. An issue is unblocked when every blocker is closed.
