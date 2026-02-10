/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase hooks for Plot-smithy (v0.36+)
 * Supports multi-story, emotion cards, dice rolling, and free-text interactions
 * 
 * Place this file in: pocketbase/pb_hooks/main.pb.js
 */

// Custom PIN login endpoint (PocketBase 0.36+ syntax)
routerAdd("POST", "/api/pin-login", (e) => {
    const info = e.requestInfo();
    const pin = info.body.pin;

    // Validate PIN format
    if (!pin || !/^\d{6}$/.test(pin)) {
        throw new BadRequestError("PIN must be exactly 6 digits");
    }

    // Find user by PIN
    let user;
    try {
        user = $app.findFirstRecordByData("users", "pin", pin);
    } catch (err) {
        throw new UnauthorizedError("Invalid PIN");
    }

    if (!user) {
        throw new UnauthorizedError("Invalid PIN");
    }

    // Generate auth token for the user
    const token = user.newAuthToken();

    return e.json(200, {
        token: token,
        user: {
            id: user.id,
            role: user.getString("role"),
            name: user.getString("name") || null
        }
    });
});

/**
 * GET /api/stories
 * Returns list of available stories for the authenticated user
 */
routerAdd("GET", "/api/stories", (e) => {
    const info = e.requestInfo();
    if (!info.auth) {
        throw new UnauthorizedError("Authentication required");
    }

    const userRole = info.auth.getString("role");
    
    // Gamemasters see all stories, others see only published
    let filter = "";
    if (userRole !== "gamemaster") {
        filter = "is_published = true";
    }

    const stories = $app.findRecordsByFilter("stories", filter, "-created", 100, 0);

    return e.json(200, {
        stories: stories.map(s => ({
            id: s.id,
            name: s.getString("name"),
            description: s.getString("description") || null,
            ownerId: s.getString("owner_id"),
            isPublished: s.getBool("is_published"),
            coverImage: s.getString("cover_image") || null,
            created: s.getString("created"),
            updated: s.getString("updated")
        }))
    });
});

/**
 * GET /api/story-context
 * Returns current node, choices, cards, and events for a specific story
 * Query: storyId (required)
 */
routerAdd("GET", "/api/story-context", (e) => {
    const info = e.requestInfo();
    if (!info.auth) {
        throw new UnauthorizedError("Authentication required");
    }

    const userId = info.auth.id;
    const storyId = e.request.url.query().get("storyId");

    if (!storyId) {
        throw new BadRequestError("storyId is required");
    }

    // Verify story exists
    let story;
    try {
        story = $app.findRecordById("stories", storyId);
    } catch (err) {
        throw new NotFoundError(`Story not found`);
    }

    // Get or create story state for this user and story
    let storyState;
    try {
        storyState = $app.findFirstRecordByFilter(
            "story_state",
            `user_id = '${userId}' && story_id = '${storyId}'`
        );
    } catch (err) {
        // Create new state with the story's start node
        let startNode;
        try {
            startNode = $app.findFirstRecordByFilter(
                "story_nodes",
                `story_id = '${storyId}' && is_start = true`
            );
        } catch (err2) {
            // Fallback to node_key = 'start'
            try {
                startNode = $app.findFirstRecordByFilter(
                    "story_nodes",
                    `story_id = '${storyId}' && node_key = 'start'`
                );
            } catch (err3) {
                throw new NotFoundError("Story has no start node");
            }
        }

        const stateCollection = $app.findCollectionByNameOrId("story_state");
        storyState = new Record(stateCollection);
        storyState.set("user_id", userId);
        storyState.set("story_id", storyId);
        storyState.set("current_node_key", startNode.getString("node_key"));
        $app.save(storyState);
    }

    const currentNodeKey = storyState.getString("current_node_key");

    // Get current node
    let currentNode;
    try {
        currentNode = $app.findFirstRecordByFilter(
            "story_nodes",
            `story_id = '${storyId}' && node_key = '${currentNodeKey}'`
        );
    } catch (err) {
        throw new NotFoundError(`Story node '${currentNodeKey}' not found`);
    }

    // Get choices for current node
    const choices = $app.findRecordsByFilter(
        "choices",
        `node_id = '${currentNode.id}'`,
        "+created",
        100,
        0
    );

    // Get emotion cards if node has a card deck
    let cards = [];
    const cardDeckId = currentNode.getString("card_deck_id");
    if (cardDeckId) {
        try {
            cards = $app.findRecordsByFilter(
                "emotion_cards",
                `deck_id = '${cardDeckId}'`,
                "+sort_order",
                100,
                0
            );
        } catch (err) {
            // No cards found, continue without them
        }
    }

    // Get recent events for this user and story (last 50)
    const events = $app.findRecordsByFilter(
        "story_events",
        `user_id = '${userId}' && story_id = '${storyId}'`,
        "-created",
        50,
        0
    );

    return e.json(200, {
        story: {
            id: story.id,
            name: story.getString("name"),
            description: story.getString("description") || null
        },
        currentNode: {
            id: currentNode.id,
            nodeKey: currentNode.getString("node_key"),
            title: currentNode.getString("title") || null,
            text: currentNode.getString("text"),
            media: currentNode.get("media") || null,
            pending: currentNode.getBool("pending"),
            interactionType: currentNode.getString("interaction_type") || null,
            diceConfig: currentNode.get("dice_config") || null,
            cardDeckId: cardDeckId || null,
            isStart: currentNode.getBool("is_start")
        },
        choices: choices.map(c => ({
            id: c.id,
            text: c.getString("text"),
            nextNode: c.getString("next_node")
        })),
        cards: cards.map(c => ({
            id: c.id,
            label: c.getString("label"),
            description: c.getString("description") || null,
            icon: c.getString("icon") || null,
            color: c.getString("color") || null,
            sortOrder: c.getInt("sort_order")
        })),
        events: events.map(ev => ({
            id: ev.id,
            nodeKey: ev.getString("node_key"),
            choiceId: ev.getString("choice_id") || null,
            choiceText: ev.getString("choice_text") || null,
            selectedCards: ev.get("selected_cards") || null,
            freeText: ev.getString("free_text") || null,
            diceResult: ev.get("dice_result") || null,
            created: ev.getString("created")
        }))
    });
});

/**
 * POST /api/record-event
 * Records a player interaction and updates story state
 * Query: storyId (required)
 * Body: { choiceId?, selectedCards?, freeText?, diceResult? }
 */
routerAdd("POST", "/api/record-event", (e) => {
    const info = e.requestInfo();
    if (!info.auth) {
        throw new UnauthorizedError("Authentication required");
    }

    const userId = info.auth.id;
    const storyId = e.request.url.query().get("storyId");
    const { choiceId, selectedCards, freeText, diceResult } = info.body;

    if (!storyId) {
        throw new BadRequestError("storyId is required");
    }

    // Get current story state
    let storyState;
    try {
        storyState = $app.findFirstRecordByFilter(
            "story_state",
            `user_id = '${userId}' && story_id = '${storyId}'`
        );
    } catch (err) {
        throw new NotFoundError("Story state not found");
    }

    const currentNodeKey = storyState.getString("current_node_key");
    let nextNodeKey = currentNodeKey; // Default: stay on same node
    let choiceText = null;

    // If a choice was made, get the next node from the choice
    if (choiceId) {
        let choice;
        try {
            choice = $app.findRecordById("choices", choiceId);
        } catch (err) {
            throw new NotFoundError(`Choice '${choiceId}' not found`);
        }

        nextNodeKey = choice.getString("next_node");
        choiceText = choice.getString("text");

        // Verify next node exists in this story
        try {
            $app.findFirstRecordByFilter(
                "story_nodes",
                `story_id = '${storyId}' && node_key = '${nextNodeKey}'`
            );
        } catch (err) {
            throw new NotFoundError(`Next node '${nextNodeKey}' not found`);
        }
    }

    // Create event record
    const eventsCollection = $app.findCollectionByNameOrId("story_events");
    const event = new Record(eventsCollection);
    event.set("user_id", userId);
    event.set("story_id", storyId);
    event.set("node_key", currentNodeKey);
    
    if (choiceId) {
        event.set("choice_id", choiceId);
        event.set("choice_text", choiceText);
    }
    
    if (selectedCards && selectedCards.length > 0) {
        event.set("selected_cards", selectedCards);
    }
    
    if (freeText) {
        event.set("free_text", freeText);
    }
    
    if (diceResult) {
        event.set("dice_result", diceResult);
        event.set("manual_dice", diceResult.isManual || false);
    }

    $app.save(event);

    // Update story state to next node (if changed)
    if (nextNodeKey !== currentNodeKey) {
        storyState.set("current_node_key", nextNodeKey);
        $app.save(storyState);
    }

    return e.json(200, {
        success: true,
        event: {
            id: event.id,
            nodeKey: currentNodeKey,
            choiceId: choiceId || null,
            choiceText: choiceText
        },
        nextNodeKey: nextNodeKey
    });
});

/**
 * POST /api/reset-story
 * Resets a player's progress in a story
 * Query: storyId (required)
 */
routerAdd("POST", "/api/reset-story", (e) => {
    const info = e.requestInfo();
    if (!info.auth) {
        throw new UnauthorizedError("Authentication required");
    }

    const userId = info.auth.id;
    const storyId = e.request.url.query().get("storyId");

    if (!storyId) {
        throw new BadRequestError("storyId is required");
    }

    // Find the start node
    let startNode;
    try {
        startNode = $app.findFirstRecordByFilter(
            "story_nodes",
            `story_id = '${storyId}' && is_start = true`
        );
    } catch (err) {
        try {
            startNode = $app.findFirstRecordByFilter(
                "story_nodes",
                `story_id = '${storyId}' && node_key = 'start'`
            );
        } catch (err2) {
            throw new NotFoundError("Story has no start node");
        }
    }

    // Update or create story state
    let storyState;
    try {
        storyState = $app.findFirstRecordByFilter(
            "story_state",
            `user_id = '${userId}' && story_id = '${storyId}'`
        );
        storyState.set("current_node_key", startNode.getString("node_key"));
        $app.save(storyState);
    } catch (err) {
        const stateCollection = $app.findCollectionByNameOrId("story_state");
        storyState = new Record(stateCollection);
        storyState.set("user_id", userId);
        storyState.set("story_id", storyId);
        storyState.set("current_node_key", startNode.getString("node_key"));
        $app.save(storyState);
    }

    // Optionally delete events (uncomment to enable)
    // const events = $app.findRecordsByFilter(
    //     "story_events",
    //     `user_id = '${userId}' && story_id = '${storyId}'`
    // );
    // events.forEach(ev => $app.delete(ev));

    return e.json(200, {
        success: true,
        currentNodeKey: startNode.getString("node_key")
    });
});

/**
 * GET /api/card-decks
 * Returns available card decks (global and story-specific)
 * Query: storyId (optional)
 */
routerAdd("GET", "/api/card-decks", (e) => {
    const info = e.requestInfo();
    if (!info.auth) {
        throw new UnauthorizedError("Authentication required");
    }

    const storyId = e.request.url.query().get("storyId");
    
    let filter = "is_global = true";
    if (storyId) {
        filter = `is_global = true || story_id = '${storyId}'`;
    }

    const decks = $app.findRecordsByFilter("card_decks", filter, "+name", 100, 0);

    return e.json(200, {
        decks: decks.map(d => {
            const cards = $app.findRecordsByFilter(
                "emotion_cards",
                `deck_id = '${d.id}'`,
                "+sort_order",
                100,
                0
            );
            
            return {
                id: d.id,
                name: d.getString("name"),
                description: d.getString("description") || null,
                storyId: d.getString("story_id") || null,
                isGlobal: d.getBool("is_global"),
                cards: cards.map(c => ({
                    id: c.id,
                    label: c.getString("label"),
                    description: c.getString("description") || null,
                    icon: c.getString("icon") || null,
                    color: c.getString("color") || null,
                    sortOrder: c.getInt("sort_order")
                }))
            };
        })
    });
});
