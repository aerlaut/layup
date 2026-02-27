---
name: implement
description: Implement changes according to a plan
---

# Implement
Use this skill when the user asks to implement a plan.

## Steps
1. Ensure the codebase is checked out in the `main` branch. If not, ask the user to merge changes to the main branch before making a plan.
2. From the `main` branch, create a new branch with a short branch name relevant to the task.
3. For each task in the plan, implement it (loop until done or blocked). Create tests for the implemented code if necessary.
4. At the completion of a task, create a git commit for each task, with a short descriptive commit message relevant to the task.
