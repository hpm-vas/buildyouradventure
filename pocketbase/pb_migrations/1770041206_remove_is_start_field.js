/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Remove is_start field from story_nodes
 * 
 * The start node is now determined by node_key === "start" convention.
 * This removes the manual is_start boolean flag.
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("story_nodes");
  
  // Remove is_start field
  collection.fields = collection.fields.filter(f => f.name !== "is_start");

  // Preserve the collection rules (they may get reset otherwise)
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";
  collection.createRule = "@request.auth.role = 'gamemaster'";
  collection.updateRule = "@request.auth.role = 'gamemaster'";
  collection.deleteRule = "@request.auth.role = 'gamemaster'";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("story_nodes");
  
  // Re-add is_start boolean field for rollback
  collection.fields.push(new Field({
    name: "is_start",
    type: "bool",
    system: false,
    required: false
  }));

  // Preserve the collection rules
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";
  collection.createRule = "@request.auth.role = 'gamemaster'";
  collection.updateRule = "@request.auth.role = 'gamemaster'";
  collection.deleteRule = "@request.auth.role = 'gamemaster'";
  
  return app.save(collection);
});
