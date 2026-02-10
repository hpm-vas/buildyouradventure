/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_story_nodes")

  // update collection data
  unmarshal({
    "listRule": null,
    "updateRule": null,
    "viewRule": null
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_story_nodes")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.role = 'gamemaster'",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
})
