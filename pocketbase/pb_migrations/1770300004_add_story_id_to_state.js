/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("story_state");
  
  // Add story_id relation field
  collection.fields.push(new Field({
    id: "story_id_field",
    name: "story_id",
    type: "relation",
    system: false,
    required: false, // Changed to false for existing records
    collectionId: "pbc_stories",
    cascadeDelete: true,
    minSelect: null,
    maxSelect: 1
  }));

  // Remove old index (PocketBase will handle adding it back)
  collection.indexes = [];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("story_state");
  
  // Remove story_id field
  collection.fields = collection.fields.filter(f => f.id !== "story_id_field");
  
  return app.save(collection);
});
