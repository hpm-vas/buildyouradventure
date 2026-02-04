/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    id: "choices",
    name: "choices",
    type: "base",
    system: false,
    fields: [
      new Field({
        id: "node_id_field",
        name: "node_id",
        type: "relation",
        system: false,
        required: true,
        collectionId: "story_nodes",
        cascadeDelete: true,
        minSelect: null,
        maxSelect: 1
      }),
      new Field({
        id: "text_field",
        name: "text",
        type: "text",
        system: false,
        required: true,
        min: 1,
        max: 1000,
        pattern: ""
      }),
      new Field({
        id: "next_node_field",
        name: "next_node",
        type: "text",
        system: false,
        required: true,
        min: 1,
        max: 100,
        pattern: "^[a-z0-9-]+$"
      })
    ],
    indexes: [
      "CREATE INDEX idx_choices_node_id ON choices (node_id)"
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'gamemaster'",
    updateRule: "@request.auth.role = 'gamemaster'",
    deleteRule: "@request.auth.role = 'gamemaster'"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("choices");
  return app.delete(collection);
});
