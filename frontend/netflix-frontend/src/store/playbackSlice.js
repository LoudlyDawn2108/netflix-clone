import { createSlice } from "@reduxjs/toolkit";

const playbackSlice = createSlice({
    name: "playback",
    initialState: {
        currentTime: 0,
        paused: true,
    },
    reducers: {
        setCurrentTime(state, action) {
            state.currentTime = action.payload;
        },
        setPaused(state, action) {
            state.paused = action.payload;
        },
    },
});

export const { setCurrentTime, setPaused } = playbackSlice.actions;
export default playbackSlice.reducer;
