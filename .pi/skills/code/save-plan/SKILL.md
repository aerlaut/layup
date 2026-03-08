---
name: save-plan
description: Persist individual tasks from a plan into separate files for multi-session execution
---

# Save Plan
Use this skill when the user asks to save a plan that has been broken down into individual tasks.

## Context
When the user run this skill, there is a high chance that the plan to be carried out is complex and would benefit from running the tasks in separate sessions.

## Steps
1. Check that the user has already run the `plan` skill and has a plan with individual tasks that can be saved. If not, ask the user to run the `plan` skill first to create a plan with individual tasks.
2. Create separate Markdown files under `.pi/plans/` for each task, and save the corresponding task details in each file. Make sure to include a brief section on the motiviation of the task, before the task details to provide context.
3. Recommend which tasks have to be carried out first, which can be done in parallel, and which can be done later. This will help the user to prioritize the tasks and plan the implementation effectively.