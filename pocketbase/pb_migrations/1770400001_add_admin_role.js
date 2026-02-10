/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");

  // Find the role field and add 'admin' to values
  const roleField = collection.fields.find(f => f.name === "role");
  if (roleField) {
    roleField.values = ["player", "reader", "gamemaster", "admin"];
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");

  // Revert: remove 'admin' from role values
  const roleField = collection.fields.find(f => f.name === "role");
  if (roleField) {
    roleField.values = ["player", "reader", "gamemaster"];
  }

  return app.save(collection);
});
