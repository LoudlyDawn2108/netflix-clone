"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2, VolumeX, Maximize, Settings } from "lucide-react";
import { getVideoById } from "@/lib/content-service";
import type { VideoContent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function VideoPlayerPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [video, setVideo] = useState<VideoContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [muted, setMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                if (!id) {
                    setError("Video ID not found");
                    setLoading(false);
                    return;
                }
                const videoData = await getVideoById(id);
                setVideo(videoData);
            } catch {
                setError("Failed to load video");
            } finally {
                setLoading(false);
            }
        };

        fetchVideo();
    }, [id]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !video) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black">
                <p className="text-xl mb-4">{error || "Video not found"}</p>
                <Button onClick={() => navigate("/")} variant="outline">
                    Back to Home
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Video Player */}
            <div className="relative w-full h-screen bg-black">
                {/* Video */}
                <video
                    className="w-full h-full object-contain"
                    src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                    autoPlay
                    playsInline
                    onTimeUpdate={(e) =>
                        setCurrentTime(e.currentTarget.currentTime)
                    }
                    onDurationChange={(e) =>
                        setDuration(e.currentTarget.duration)
                    }
                    onEnded={() => setIsPlaying(false)}
                    muted={muted}
                />

                {/* Controls Overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-b from-black/70 via-transparent to-black/70 opacity-0 hover:opacity-100 transition-opacity">
                    {/* Top Controls */}
                    <div className="flex items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <h1 className="ml-4 text-xl font-medium">
                            {video.title}
                        </h1>
                    </div>

                    {/* Bottom Controls */}
                    <div className="space-y-4">
                        {/* Progress Bar */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm">
                                {formatTime(currentTime)}
                            </span>
                            <Slider
                                value={[currentTime]}
                                max={duration}
                                step={0.1}
                                className="flex-1 [&>span:first-child]:h-1 [&>span:first-child]:bg-white/30 [&_[role=slider]]:bg-red-600 [&_[role=slider]]:w-3 [&_[role=slider]]:h-3 [&_[role=slider]]:border-0 [&>span:first-child_span]:bg-red-600"
                                onValueChange={(value) => {
                                    const video =
                                        document.querySelector("video");
                                    if (video) video.currentTime = value[0];
                                }}
                            />
                            <span className="text-sm">
                                {formatTime(duration)}
                            </span>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white"
                                onClick={() => {
                                    const video =
                                        document.querySelector("video");
                                    if (video) {
                                        if (isPlaying) {
                                            video.pause();
                                        } else {
                                            video.play();
                                        }
                                        setIsPlaying(!isPlaying);
                                    }
                                }}
                            >
                                {isPlaying ? (
                                    <svg
                                        className="h-6 w-6"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                    </svg>
                                ) : (
                                    <svg
                                        className="h-6 w-6"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white"
                                onClick={() => setMuted(!muted)}
                            >
                                {muted ? (
                                    <VolumeX className="h-6 w-6" />
                                ) : (
                                    <Volume2 className="h-6 w-6" />
                                )}
                            </Button>

                            <div className="ml-auto flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white"
                                >
                                    <Settings className="h-6 w-6" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white"
                                >
                                    <Maximize className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
