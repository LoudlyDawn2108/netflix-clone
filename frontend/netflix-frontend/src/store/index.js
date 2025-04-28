import { configureStore } from "@reduxjs/toolkit";
import playbackReducer from "./playbackSlice";

const rootReducer = {
    playback: playbackReducer,
};

const store = configureStore({
    reducer: rootReducer,
});

export default store;
