import { configureStore } from "@reduxjs/toolkit";
import * as Sentry from "@sentry/react";
import playbackReducer from "./playbackSlice";

// Create a Sentry middleware for Redux
const sentryReduxEnhancer = Sentry.createReduxEnhancer({
    // Only report errors for specific types of actions
    actionTransformer: (action) => {
        // Filter out noisy actions if needed
        if (
            action.type.endsWith("/pending") ||
            action.type.endsWith("/fulfilled")
        ) {
            return null;
        }
        return action;
    },
    // Add additional context to state
    stateTransformer: (state) => {
        // Customize what you send to Sentry - avoid sending sensitive info
        const { playback } = state;
        return {
            playback: {
                ...playback,
                // You can filter sensitive data from state if needed
                encryptionKey: playback.encryptionKey ? "[FILTERED]" : null,
            },
        };
    },
});

const rootReducer = {
    playback: playbackReducer,
};

const store = configureStore({
    reducer: rootReducer,
    // Add the Sentry enhancer to monitor Redux
    enhancers: (getDefaultEnhancers) =>
        getDefaultEnhancers().concat(sentryReduxEnhancer),
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore non-serializable values for debugging and Sentry reporting
                ignoredActions: [
                    "playback/setPlayer",
                    "playback/setMediaElement",
                ],
                ignoredPaths: ["playback.player", "playback.mediaElement"],
            },
        }),
});

export default store;
