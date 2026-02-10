/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Fix story_nodes list/view rules that were set to null by migration 1770205624
  try {
    const storyNodes = app.findCollectionByNameOrId("story_nodes");
    storyNodes.listRule = "@request.auth.id != ''";
    storyNodes.viewRule = "@request.auth.id != ''";
    storyNodes.createRule = "@request.auth.role = 'gamemaster'";
    storyNodes.updateRule = "@request.auth.role = 'gamemaster'";
    storyNodes.deleteRule = "@request.auth.role = 'gamemaster'";
    app.save(storyNodes);
    console.log("story_nodes rules fully fixed");
  } catch (e) {
    console.log("story_nodes collection not found:", e);
  }

  // Fix choices rules
  try {
    const choices = app.findCollectionByNameOrId("choices");
    choices.listRule = "@request.auth.id != ''";
    choices.viewRule = "@request.auth.id != ''";
    choices.createRule = "@request.auth.role = 'gamemaster'";
    choices.updateRule = "@request.auth.role = 'gamemaster'";
    choices.deleteRule = "@request.auth.role = 'gamemaster'";
    app.save(choices);
    console.log("choices rules fully fixed");
  } catch (e) {
    console.log("choices collection not found:", e);
  }

  console.log("Migration 1770400004: All collection rules fully restored");
}, (app) => {
  // Revert (no-op)
});
