# Passenger case unfollow design

## Goal

Let a passenger stop tracking an individual case from the Cases page.

## Scope

- Show a `取消追蹤` secondary button below each passenger case card.
- Selecting it removes only that case from the visible passenger tracking list.
- Show a short `已取消追蹤` status message after removal.
- Do not change staff or supervisor task behavior.
- This is a demo-only local UI state change; it does not change backend tasks.

## Implementation

The passenger branch of the existing case-list component will maintain a set of hidden task IDs. It will render cards from the task list minus that set. The button adds the selected task ID to the set and records the case event ID for the status message.

## Acceptance checks

- Every visible passenger case has a `取消追蹤` button.
- Removing one case leaves other tracked cases visible.
- The removed case no longer appears in the list.
- Staff and supervisor lists do not render the button.
- Existing case behavior remains intact.
