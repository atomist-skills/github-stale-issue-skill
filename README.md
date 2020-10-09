# `atomist/github-stale-issue-skill`

<!---atomist-skill-description:start--->

Mark and close stale issues and pull requests

<!---atomist-skill-description:end--->

---

<!---atomist-skill-readme:start--->

# What it's useful for

Helps to keep your project's backlog clean by managing stale issues and pull
requests. It takes away the time-consuming task to go through open issues and
ask for more information or close issues that got abandoned by their authors.

# How it works

A GitHub issue and/or pull request that doesn't see any activity within a
configurable amount of days, gets marked with a certain label to indicate that
it has become stale. Optionally this skill adds a comment to the issue or pull
request to inform contributors about the pending closing due to lack of
activity.

Once an issue or pull request sees now activity within a configurable amount of
days after it has been marked stale, it will be closed.

When an issue or pull request that is marked stale gets modified, the stale
label will automatically be removed.

<!---atomist-skill-readme:end--->

---

Created by [Atomist][atomist]. Need Help? [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ "Atomist - How Teams Deliver Software"
[slack]: https://join.atomist.com/ "Atomist Community Slack"
