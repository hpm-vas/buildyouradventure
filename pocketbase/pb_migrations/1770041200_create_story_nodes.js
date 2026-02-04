/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    id: "pbc_story_nodes",
    name: "story_nodes",
    type: "base",
    system: false,
    fields: [
      new Field({
        id: "node_key_field",
        name: "node_key",
        type: "text",
        system: false,
        required: true,
        presentable: true,
        min: 1,
        max: 100,
        pattern: "^[a-z0-9-]+$"
      }),
      new Field({
        id: "title_field",
        name: "title",
        type: "text",
        system: false,
        required: false,
        min: null,
        max: 500,
        pattern: ""
      }),
      new Field({
        id: "text_field",
        name: "text",
        type: "editor",
        system: false,
        required: true,
        convertUrls: false
      }),
      new Field({
        id: "media_field",
        name: "media",
        type: "json",
        system: false,
        required: false,
        maxSize: 2000000
      }),
      new Field({
        id: "pending_field",
        name: "pending",
        type: "bool",
        system: false,
        required: false
      })
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_node_key ON story_nodes (node_key)"
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'gamemaster'",
    updateRule: "@request.auth.role = 'gamemaster'",
    deleteRule: "@request.auth.role = 'gamemaster'"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("story_nodes");
  return app.delete(collection);
});
