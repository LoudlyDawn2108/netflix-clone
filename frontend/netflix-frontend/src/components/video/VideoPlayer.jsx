import { useRef, useEffect } from "react";
import Hls from "hls.js";
import { useDispatch } from "react-redux";
import { setCurrentTime, setPaused } from "../../store/playbackSlice";

export default function VideoPlayer({ src, poster }) {
    const videoRef = useRef(null);
    const dispatch = useDispatch();

    useEffect(() => {
        const video = videoRef.current;
        let hls;
        if (video && src.endsWith(".m3u8") && Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
        } else if (video) {
            video.src = src;
        }

        function onTimeUpdate() {
            dispatch(setCurrentTime(video.currentTime));
        }
        function onPause() {
            dispatch(setPaused(true));
        }
        function onPlay() {
            dispatch(setPaused(false));
        }

        if (video) {
            video.addEventListener("timeupdate", onTimeUpdate);
            video.addEventListener("pause", onPause);
            video.addEventListener("play", onPlay);
        }

        return () => {
            if (hls) hls.destroy();
            if (video) {
                video.removeEventListener("timeupdate", onTimeUpdate);
                video.removeEventListener("pause", onPause);
                video.removeEventListener("play", onPlay);
            }
        };
    }, [src, dispatch]);

    return (
        <div className="w-full max-h-[450px] bg-black rounded overflow-hidden">
            <video
                ref={videoRef}
                poster={poster}
                controls
                className="w-full h-full object-contain"
            />
        </div>
    );
}
