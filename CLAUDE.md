## Objective

This is repo for a AI chat mobile app called cosailor. See the docs/architecture.md for overall idea and principles.

## Rules

- Commit your code frequently.
  - At lease commit after each task is complete
  - Commits should be such that it is easier for human to review
  - Specify the files you are committing in `git add` because, other
	changes might be going on parallely by the user.

- After planning save the task specification and the plan
  inside docs/tasks/ with numbered filename (e.g. 01 setup project.md)

  After completion the tasks are moved to docs/tasks/done

  When asked to work on a task, just read that particular tasks file
  and other architecture files from docs/. Don't read other task files.

- Document architectural and design decisions inside docs/ and link
  those files in architecture section of CLAUDE.md
  - For each part of the architecture, don't go into implementation details but rather
	the ideas/approach of that part, and the interface (i.e. functions
	and types that other piece of code will use to interact with that part)
  - When you complete a task, update the documentation for the
	relevant part if necessary.

- When planning read the docs/ file before looking at the code because
  it has the overall idea and the interface documentation need to make
  plans.
