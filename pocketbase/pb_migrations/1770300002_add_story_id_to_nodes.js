/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("story_nodes");
  
  // Add story_id relation field
  collection.fields.push(new Field({
    id: "story_id_field",
    name: "story_id",
    type: "relation",
    system: false,
    required: false, // Changed to false since existing nodes won't have it
    collectionId: "pbc_stories",
    cascadeDelete: true,
    minSelect: null,
    maxSelect: 1
  }));

  // Add interaction_type field (choice, card_choice, card_text, text)
  collection.fields.push(new Field({
    id: "interaction_type_field",
    name: "interaction_type",
    type: "select",
    system: false,
    required: false,
    values: [
      "choice",
      "choice_text",
      "choice_roll",
      "choice_roll_text",
      "card_choice",
      "card_choice_text",
      "card_choice_roll",
      "card_choice_roll_text",
      "card_text",
      "text"
    ],
    maxSelect: 1
  }));

  // Add dice configuration (JSON for flexibility)
  collection.fields.push(new Field({
    id: "dice_config_field",
    name: "dice_config",
    type: "json",
    system: false,
    required: false,
    maxSize: 10000
  }));

  // Note: card_deck_id will be added after card_decks collection is created

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("story_nodes");
  
  // Remove added fields
  collection.fields = collection.fields.filter(f => 
    !["story_id_field", "interaction_type_field", "dice_config_field"].includes(f.id)
  );
  
  return app.save(collection);
});
