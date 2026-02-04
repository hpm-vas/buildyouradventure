/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("story_nodes");
  
  // Add is_start boolean field
  collection.fields.push(new Field({
    name: "is_start",
    type: "bool",
    system: false,
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("story_nodes");
  
  // Remove is_start field
  collection.fields = collection.fields.filter(f => f.name !== "is_start");
  
  return app.save(collection);
});
