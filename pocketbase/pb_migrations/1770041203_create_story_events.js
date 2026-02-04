/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    id: "pbc_story_events",
    name: "story_events",
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
        id: "node_key_field",
        name: "node_key",
        type: "text",
        system: false,
        required: true,
        min: 1,
        max: 100,
        pattern: "^[a-z0-9-]+$"
      }),
      new Field({
        id: "choice_id_field",
        name: "choice_id",
        type: "relation",
        system: false,
        required: false,
        collectionId: "pbc_choices",
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 1
      }),
      new Field({
        id: "choice_text_field",
        name: "choice_text",
        type: "text",
        system: false,
        required: false,
        min: null,
        max: 1000,
        pattern: ""
      })
    ],
    indexes: [
      "CREATE INDEX idx_story_events_user ON story_events (user_id)",
      "CREATE INDEX idx_story_events_node ON story_events (node_key)"
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.role = 'gamemaster'",
    deleteRule: "@request.auth.role = 'gamemaster'"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("story_events");
  return app.delete(collection);
});
