/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("story_nodes");
  
  // Add card_deck_id for emotion cards (card_decks collection now exists)
  collection.fields.push(new Field({
    id: "card_deck_id_field",
    name: "card_deck_id",
    type: "relation",
    system: false,
    required: false,
    collectionId: "pbc_card_decks",
    cascadeDelete: false,
    minSelect: null,
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("story_nodes");
  
  // Remove card_deck_id field
  collection.fields = collection.fields.filter(f => f.id !== "card_deck_id_field");
  
  return app.save(collection);
});
