/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    id: "story_state",
    name: "story_state",
    type: "base",
    system: false,
    fields: [
      new Field({
        id: "user_id_field",
        name: "user_id",
        type: "relation",
        system: false,
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: true,
        minSelect: null,
        maxSelect: 1
      }),
      new Field({
        id: "current_node_key_field",
        name: "current_node_key",
        type: "text",
        system: false,
        required: true,
        min: 1,
        max: 100,
        pattern: "^[a-z0-9-]+$"
      })
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_story_state_user ON story_state (user_id)"
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.role = 'gamemaster'"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("story_state");
  return app.delete(collection);
});
