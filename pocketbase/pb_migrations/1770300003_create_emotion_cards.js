/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Create card_decks collection first
  const decksCollection = new Collection({
    id: "pbc_card_decks",
    name: "card_decks",
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
        max: 100,
        pattern: ""
      }),
      new Field({
        id: "description_field",
        name: "description",
        type: "text",
        system: false,
        required: false,
        min: null,
        max: 500,
        pattern: ""
      }),
      new Field({
        id: "story_id_field",
        name: "story_id",
        type: "relation",
        system: false,
        required: false, // null = global deck
        collectionId: "pbc_stories",
        cascadeDelete: true,
        minSelect: null,
        maxSelect: 1
      }),
      new Field({
        id: "is_global_field",
        name: "is_global",
        type: "bool",
        system: false,
        required: false
      })
    ],
    indexes: [
      "CREATE INDEX idx_card_decks_story ON card_decks (story_id)"
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'"
  });
  app.save(decksCollection);

  // Create emotion_cards collection
  const cardsCollection = new Collection({
    id: "pbc_emotion_cards",
    name: "emotion_cards",
    type: "base",
    system: false,
    fields: [
      new Field({
        id: "deck_id_field",
        name: "deck_id",
        type: "relation",
        system: false,
        required: true,
        collectionId: "pbc_card_decks",
        cascadeDelete: true,
        minSelect: null,
        maxSelect: 1
      }),
      new Field({
        id: "label_field",
        name: "label",
        type: "text",
        system: false,
        required: true,
        presentable: true,
        min: 1,
        max: 100,
        pattern: ""
      }),
      new Field({
        id: "description_field",
        name: "description",
        type: "text",
        system: false,
        required: false,
        min: null,
        max: 500,
        pattern: ""
      }),
      new Field({
        id: "icon_field",
        name: "icon",
        type: "text",
        system: false,
        required: false,
        min: null,
        max: 50,
        pattern: ""
      }),
      new Field({
        id: "color_field",
        name: "color",
        type: "text",
        system: false,
        required: false,
        min: null,
        max: 20,
        pattern: "^#[0-9A-Fa-f]{6}$|^$"
      }),
      new Field({
        id: "sort_order_field",
        name: "sort_order",
        type: "number",
        system: false,
        required: false,
        min: null,
        max: null,
        noDecimal: true
      })
    ],
    indexes: [
      "CREATE INDEX idx_emotion_cards_deck ON emotion_cards (deck_id)",
      "CREATE INDEX idx_emotion_cards_order ON emotion_cards (deck_id, sort_order)"
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'"
  });

  return app.save(cardsCollection);
}, (app) => {
  // Delete in reverse order
  const cardsCollection = app.findCollectionByNameOrId("emotion_cards");
  app.delete(cardsCollection);
  
  const decksCollection = app.findCollectionByNameOrId("card_decks");
  return app.delete(decksCollection);
});
