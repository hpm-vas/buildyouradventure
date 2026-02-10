/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Create a default global emotion card deck
  const decksCollection = app.findCollectionByNameOrId("card_decks");
  const deck = new Record(decksCollection);
  deck.set("name", "Basic Emotions");
  deck.set("description", "A default deck of basic emotion cards for story interactions");
  deck.set("is_global", true);
  deck.set("story_id", null);
  app.save(deck);

  // Create emotion cards
  const cardsCollection = app.findCollectionByNameOrId("emotion_cards");
  
  const emotions = [
    { label: "Joy", description: "Happiness, delight, excitement", icon: "😊", color: "#FFD700", sort: 1 },
    { label: "Sadness", description: "Melancholy, grief, sorrow", icon: "😢", color: "#4169E1", sort: 2 },
    { label: "Fear", description: "Anxiety, dread, terror", icon: "😨", color: "#9932CC", sort: 3 },
    { label: "Anger", description: "Frustration, rage, annoyance", icon: "😠", color: "#DC143C", sort: 4 },
    { label: "Surprise", description: "Shock, amazement, wonder", icon: "😲", color: "#FF6347", sort: 5 },
    { label: "Curiosity", description: "Interest, intrigue, fascination", icon: "🤔", color: "#20B2AA", sort: 6 },
    { label: "Hope", description: "Optimism, anticipation, faith", icon: "🌟", color: "#FFB6C1", sort: 7 },
    { label: "Determination", description: "Resolve, persistence, willpower", icon: "💪", color: "#FF8C00", sort: 8 }
  ];

  for (const emotion of emotions) {
    const card = new Record(cardsCollection);
    card.set("deck_id", deck.id);
    card.set("label", emotion.label);
    card.set("description", emotion.description);
    card.set("icon", emotion.icon);
    card.set("color", emotion.color);
    card.set("sort_order", emotion.sort);
    app.save(card);
  }
}, (app) => {
  // Delete the default deck (cards will cascade delete)
  try {
    const deck = app.findFirstRecordByData("card_decks", "name", "Basic Emotions");
    if (deck) {
      app.delete(deck);
    }
  } catch (e) {
    // Ignore if not found
  }
});
