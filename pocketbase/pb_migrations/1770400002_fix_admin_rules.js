/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Update stories collection to accept gamemaster role
  try {
    const stories = app.findCollectionByNameOrId("stories");
    stories.listRule = "@request.auth.id != ''";
    stories.viewRule = "@request.auth.id != ''";
    stories.createRule = "@request.auth.role = 'gamemaster'";
    stories.updateRule = "@request.auth.role = 'gamemaster'";
    stories.deleteRule = "@request.auth.role = 'gamemaster'";
    app.save(stories);
  } catch (e) {
    console.log("stories collection not found, skipping");
  }

  // Update emotion_card_decks collection
  try {
    const decks = app.findCollectionByNameOrId("emotion_card_decks");
    decks.listRule = "@request.auth.id != ''";
    decks.viewRule = "@request.auth.id != ''";
    decks.createRule = "@request.auth.role = 'gamemaster'";
    decks.updateRule = "@request.auth.role = 'gamemaster'";
    decks.deleteRule = "@request.auth.role = 'gamemaster'";
    app.save(decks);
  } catch (e) {
    console.log("emotion_card_decks collection not found, skipping");
  }

  // Update emotion_cards collection
  try {
    const cards = app.findCollectionByNameOrId("emotion_cards");
    cards.listRule = "@request.auth.id != ''";
    cards.viewRule = "@request.auth.id != ''";
    cards.createRule = "@request.auth.role = 'gamemaster'";
    cards.updateRule = "@request.auth.role = 'gamemaster'";
    cards.deleteRule = "@request.auth.role = 'gamemaster'";
    app.save(cards);
  } catch (e) {
    console.log("emotion_cards collection not found, skipping");
  }
}, (app) => {
  // Revert (no-op since we only use gamemaster now)
});
