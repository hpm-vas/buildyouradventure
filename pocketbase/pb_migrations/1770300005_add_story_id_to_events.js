/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("story_events");
  
  // Add story_id relation field
  collection.fields.push(new Field({
    id: "story_id_field",
    name: "story_id",
    type: "relation",
    system: false,
    required: false, // Changed to false for existing records
    collectionId: "pbc_stories",
    cascadeDelete: true,
    minSelect: null,
    maxSelect: 1
  }));

  // Add selected_cards field (JSON array of card IDs)
  collection.fields.push(new Field({
    id: "selected_cards_field",
    name: "selected_cards",
    type: "json",
    system: false,
    required: false,
    maxSize: 10000
  }));

  // Add free_text field for text input
  collection.fields.push(new Field({
    id: "free_text_field",
    name: "free_text",
    type: "text",
    system: false,
    required: false,
    min: null,
    max: 10000,
    pattern: ""
  }));

  // Add dice_result field (JSON for roll details)
  collection.fields.push(new Field({
    id: "dice_result_field",
    name: "dice_result",
    type: "json",
    system: false,
    required: false,
    maxSize: 10000
  }));

  // Add manual_dice field for manually entered dice values
  collection.fields.push(new Field({
    id: "manual_dice_field",
    name: "manual_dice",
    type: "bool",
    system: false,
    required: false
  }));

  // Skip index creation - let PocketBase handle it automatically

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("story_events");
  
  // Remove added fields
  collection.fields = collection.fields.filter(f => 
    !["story_id_field", "selected_cards_field", "free_text_field", "dice_result_field", "manual_dice_field"].includes(f.id)
  );
  
  return app.save(collection);
});
