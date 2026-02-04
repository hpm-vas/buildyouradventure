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
