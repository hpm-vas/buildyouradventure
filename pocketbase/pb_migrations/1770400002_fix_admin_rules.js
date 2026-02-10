/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Update stories collection to accept both admin and gamemaster roles
  try {
    const stories = app.findCollectionByNameOrId("stories");
    stories.createRule = "@request.auth.role = 'admin' || @request.auth.role = 'gamemaster'";
    stories.updateRule = "@request.auth.role = 'admin' || @request.auth.role = 'gamemaster'";
    stories.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'gamemaster'";
    app.save(stories);
  } catch (e) {
    console.log("stories collection not found, skipping");
  }

  // Update emotion_card_decks collection
  try {
    const decks = app.findCollectionByNameOrId("emotion_card_decks");
    decks.createRule = "@request.auth.role = 'admin' || @request.auth.role = 'gamemaster'";
    decks.updateRule = "@request.auth.role = 'admin' || @request.auth.role = 'gamemaster'";
    decks.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'gamemaster'";
    app.save(decks);
  } catch (e) {
    console.log("emotion_card_decks collection not found, skipping");
  }

  // Update emotion_cards collection
  try {
    const cards = app.findCollectionByNameOrId("emotion_cards");
    cards.createRule = "@request.auth.role = 'admin' || @request.auth.role = 'gamemaster'";
    cards.updateRule = "@request.auth.role = 'admin' || @request.auth.role = 'gamemaster'";
    cards.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'gamemaster'";
    app.save(cards);
  } catch (e) {
    console.log("emotion_cards collection not found, skipping");
  }
}, (app) => {
  // Revert to admin-only rules
  try {
    const stories = app.findCollectionByNameOrId("stories");
    stories.createRule = "@request.auth.role = 'admin'";
    stories.updateRule = "@request.auth.role = 'admin'";
    stories.deleteRule = "@request.auth.role = 'admin'";
    app.save(stories);
  } catch (e) {}

  try {
    const decks = app.findCollectionByNameOrId("emotion_card_decks");
    decks.createRule = "@request.auth.role = 'admin'";
    decks.updateRule = "@request.auth.role = 'admin'";
    decks.deleteRule = "@request.auth.role = 'admin'";
    app.save(decks);
  } catch (e) {}

  try {
    const cards = app.findCollectionByNameOrId("emotion_cards");
    cards.createRule = "@request.auth.role = 'admin'";
    cards.updateRule = "@request.auth.role = 'admin'";
    cards.deleteRule = "@request.auth.role = 'admin'";
    app.save(cards);
  } catch (e) {}
});
