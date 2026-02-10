/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Update story_nodes collection to accept gamemaster role
  try {
    const storyNodes = app.findCollectionByNameOrId("story_nodes");
    storyNodes.createRule = "@request.auth.role = 'gamemaster'";
    storyNodes.updateRule = "@request.auth.role = 'gamemaster'";
    storyNodes.deleteRule = "@request.auth.role = 'gamemaster'";
    app.save(storyNodes);
    console.log("story_nodes rules updated");
  } catch (e) {
    console.log("story_nodes collection not found, skipping:", e);
  }

  // Update choices collection to accept gamemaster role
  try {
    const choices = app.findCollectionByNameOrId("choices");
    choices.createRule = "@request.auth.role = 'gamemaster'";
    choices.updateRule = "@request.auth.role = 'gamemaster'";
    choices.deleteRule = "@request.auth.role = 'gamemaster'";
    app.save(choices);
    console.log("choices rules updated");
  } catch (e) {
    console.log("choices collection not found, skipping:", e);
  }

  // Update story_state collection deleteRule to accept gamemaster
  try {
    const storyState = app.findCollectionByNameOrId("story_state");
    storyState.deleteRule = "@request.auth.role = 'gamemaster'";
    app.save(storyState);
    console.log("story_state rules updated");
  } catch (e) {
    console.log("story_state collection not found, skipping:", e);
  }

  // Update story_events collection to accept gamemaster role
  try {
    const storyEvents = app.findCollectionByNameOrId("story_events");
    storyEvents.updateRule = "@request.auth.role = 'gamemaster'";
    storyEvents.deleteRule = "@request.auth.role = 'gamemaster'";
    app.save(storyEvents);
    console.log("story_events rules updated");
  } catch (e) {
    console.log("story_events collection not found, skipping:", e);
  }

  console.log("Migration 1770400003: All collection rules updated for gamemaster role");
}, (app) => {
  // Revert (no-op since we only use gamemaster now)
});
