/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Fix story_nodes rules
  const storyNodes = app.findCollectionByNameOrId("story_nodes");
  storyNodes.listRule = "@request.auth.id != ''";
  storyNodes.viewRule = "@request.auth.id != ''";
  storyNodes.createRule = "@request.auth.role = 'gamemaster'";
  storyNodes.updateRule = "@request.auth.role = 'gamemaster'";
  storyNodes.deleteRule = "@request.auth.role = 'gamemaster'";
  app.save(storyNodes);

  // Fix choices rules
  const choices = app.findCollectionByNameOrId("choices");
  choices.listRule = "@request.auth.id != ''";
  choices.viewRule = "@request.auth.id != ''";
  choices.createRule = "@request.auth.role = 'gamemaster'";
  choices.updateRule = "@request.auth.role = 'gamemaster'";
  choices.deleteRule = "@request.auth.role = 'gamemaster'";
  app.save(choices);

  console.log("Collection rules updated for story_nodes and choices");
}, (app) => {
  // Revert to superuser-only (default)
  const storyNodes = app.findCollectionByNameOrId("story_nodes");
  storyNodes.listRule = null;
  storyNodes.viewRule = null;
  storyNodes.createRule = null;
  storyNodes.updateRule = null;
  storyNodes.deleteRule = null;
  app.save(storyNodes);

  const choices = app.findCollectionByNameOrId("choices");
  choices.listRule = null;
  choices.viewRule = null;
  choices.createRule = null;
  choices.updateRule = null;
  choices.deleteRule = null;
  app.save(choices);
});
