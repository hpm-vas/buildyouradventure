/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    id: "pbc_stories",
    name: "stories",
    type: "base",
    system: false,
    fields: [
      new Field({
        id: "name_field",
        name: "name",
        type: "text",
        system: false,
        required: true,
        presentable: true,
        min: 1,
        max: 200,
        pattern: ""
      }),
      new Field({
        id: "description_field",
        name: "description",
        type: "editor",
        system: false,
        required: false,
        convertUrls: false
      }),
      new Field({
        id: "owner_id_field",
        name: "owner_id",
        type: "relation",
        system: false,
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 1
      }),
      new Field({
        id: "is_published_field",
        name: "is_published",
        type: "bool",
        system: false,
        required: false
      }),
      new Field({
        id: "cover_image_field",
        name: "cover_image",
        type: "file",
        system: false,
        required: false,
        mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        maxSize: 5242880,
        maxSelect: 1
      })
    ],
    indexes: [
      "CREATE INDEX idx_stories_owner ON stories (owner_id)",
      "CREATE INDEX idx_stories_published ON stories (is_published)"
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'gamemaster'",
    updateRule: "@request.auth.role = 'gamemaster'",
    deleteRule: "@request.auth.role = 'gamemaster'"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("stories");
  return app.delete(collection);
});
