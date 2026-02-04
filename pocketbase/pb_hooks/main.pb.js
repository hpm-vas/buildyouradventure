/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase hooks for Plot-smithy (v0.36+)
 * Place this file in: pocketbase/pb_hooks/main.pb.js
 * 
 * PocketBase will automatically load and execute hooks from pb_hooks/
 */

// Custom PIN login endpoint (PocketBase 0.36+ syntax)
routerAdd("POST", "/api/pin-login", (e) => {
    // Parse request body using requestInfo() (PocketBase 0.36+ API)
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
        // User not found
        throw new UnauthorizedError("Invalid PIN");
    }

    if (!user) {
        throw new UnauthorizedError("Invalid PIN");
    }

    // Generate auth token for the user (v0.36+ - method on record)
    const token = user.newAuthToken();

    // Return token and user info
    return e.json(200, {
        token: token,
        user: {
            id: user.id,
            role: user.getString("role"),
            name: user.getString("name") || null
        }
    });
});

// Note: PocketBase 0.36+ has a built-in /api/health endpoint

// Default start node for new players
const DEFAULT_START_NODE = "start";

/**
 * GET /api/story-context
 * Returns current node, its choices, and recent events for the authenticated user
 */
routerAdd("GET", "/api/story-context", (e) => {
    // Require authentication
    const info = e.requestInfo();
    if (!info.auth) {
        throw new UnauthorizedError("Authentication required");
    }

    const userId = info.auth.id;

    // Get or create story state for user
    let storyState;
    try {
        storyState = $app.findFirstRecordByData("story_state", "user_id", userId);
    } catch (err) {
        // No state exists, create one with default start node
        const stateCollection = $app.findCollectionByNameOrId("story_state");
        storyState = new Record(stateCollection);
        storyState.set("user_id", userId);
        storyState.set("current_node_key", DEFAULT_START_NODE);
        $app.save(storyState);
    }

    const currentNodeKey = storyState.getString("current_node_key") || DEFAULT_START_NODE;

    // Get current node
    let currentNode;
    try {
        currentNode = $app.findFirstRecordByData("story_nodes", "node_key", currentNodeKey);
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

    // Get recent events for this user (last 50)
    const events = $app.findRecordsByFilter(
        "story_events",
        `user_id = '${userId}'`,
        "-created",
        50,
        0
    );

    // Format response
    return e.json(200, {
        currentNode: {
            id: currentNode.id,
            nodeKey: currentNode.getString("node_key"),
            title: currentNode.getString("title") || null,
            text: currentNode.getString("text"),
            media: currentNode.get("media") || null,
            pending: currentNode.getBool("pending")
        },
        choices: choices.map(c => ({
            id: c.id,
            text: c.getString("text"),
            nextNode: c.getString("next_node")
        })),
        events: events.map(ev => ({
            id: ev.id,
            nodeKey: ev.getString("node_key"),
            choiceId: ev.getString("choice_id") || null,
            choiceText: ev.getString("choice_text") || null,
            created: ev.getString("created")
        }))
    });
});

/**
 * POST /api/record-event
 * Records a player choice and updates story state
 * Body: { choiceId: string }
 */
routerAdd("POST", "/api/record-event", (e) => {
    // Require authentication
    const info = e.requestInfo();
    if (!info.auth) {
        throw new UnauthorizedError("Authentication required");
    }

    const userId = info.auth.id;
    const choiceId = info.body.choiceId;

    if (!choiceId) {
        throw new BadRequestError("choiceId is required");
    }

    // Get the choice record
    let choice;
    try {
        choice = $app.findRecordById("choices", choiceId);
    } catch (err) {
        throw new NotFoundError(`Choice '${choiceId}' not found`);
    }

    const nextNodeKey = choice.getString("next_node");
    const choiceText = choice.getString("text");

    // Verify next node exists
    let nextNode;
    try {
        nextNode = $app.findFirstRecordByData("story_nodes", "node_key", nextNodeKey);
    } catch (err) {
        throw new NotFoundError(`Next node '${nextNodeKey}' not found`);
    }

    // Get current story state to record the node we're leaving
    let storyState;
    try {
        storyState = $app.findFirstRecordByData("story_state", "user_id", userId);
    } catch (err) {
        throw new NotFoundError("Story state not found for user");
    }

    const currentNodeKey = storyState.getString("current_node_key");

    // Create event record
    const eventsCollection = $app.findCollectionByNameOrId("story_events");
    const event = new Record(eventsCollection);
    event.set("user_id", userId);
    event.set("node_key", currentNodeKey);
    event.set("choice_id", choiceId);
    event.set("choice_text", choiceText);
    $app.save(event);

    // Update story state to next node
    storyState.set("current_node_key", nextNodeKey);
    $app.save(storyState);

    return e.json(200, {
        success: true,
        event: {
            id: event.id,
            nodeKey: currentNodeKey,
            choiceId: choiceId,
            choiceText: choiceText
        },
        nextNodeKey: nextNodeKey
    });
});
