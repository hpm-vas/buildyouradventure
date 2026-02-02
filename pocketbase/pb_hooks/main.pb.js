/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase hooks for Plot-smithy
 * Place this file in: pocketbase/pb_hooks/main.pb.js
 * 
 * PocketBase will automatically load and execute hooks from pb_hooks/
 */

// Custom PIN login endpoint
routerAdd("POST", "/api/pin-login", (c) => {
    const data = $apis.requestInfo(c).data;
    const pin = data.pin;

    // Validate PIN format
    if (!pin || !/^\d{6}$/.test(pin)) {
        throw new BadRequestError("PIN must be exactly 6 digits");
    }

    // Find user by PIN
    let user;
    try {
        user = $app.dao().findFirstRecordByData("users", "pin", pin);
    } catch (e) {
        // User not found
        throw new UnauthorizedError("Invalid PIN");
    }

    if (!user) {
        throw new UnauthorizedError("Invalid PIN");
    }

    // Generate auth token for the user
    const token = $tokens.recordAuthToken($app, user);

    // Return token and user info
    return c.json(200, {
        token: token,
        user: {
            id: user.id,
            role: user.getString("role"),
            name: user.getString("name") || null
        }
    });
}, $apis.activityLogger($app));

// Health check endpoint
routerAdd("GET", "/api/health", (c) => {
    return c.json(200, {
        status: "ok",
        timestamp: new Date().toISOString()
    });
});
