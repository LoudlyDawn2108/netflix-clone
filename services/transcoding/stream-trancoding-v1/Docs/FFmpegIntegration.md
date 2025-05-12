# FFmpeg Integration for Streamflix Transcoding Service

This document describes the FFmpeg integration for the Streamflix Transcoding Service.

## Overview

The Streamflix Transcoding Service uses FFmpeg to convert uploaded master video files into adaptive bitrate renditions for streaming. The implementation supports:

-   Multiple quality renditions (SD, HD, 4K)
-   HLS and DASH manifest generation
-   Configurable transcoding profiles
-   Automatic FFmpeg download if not installed
-   Progress tracking for transcoding jobs

## Components

### FFmpegService

The `FFmpegService` is responsible for:

-   Initializing FFmpeg (downloading if necessary)
-   Tracking progress of transcoding jobs
-   Managing FFmpeg configuration

### FFmpegTranscoder

The `FFmpegTranscoder` handles:

-   Video transcoding to multiple renditions
-   Applying encoding profiles
-   Creating HLS playlists
-   Creating DASH manifests

### TranscodingService

The `TranscodingService` orchestrates the entire video processing workflow:

1. Downloads source file from S3
2. Creates temporary working directories
3. Invokes FFmpegTranscoder to create renditions
4. Uploads transcoded files and manifests to S3
5. Updates job status in the database

## Configuration

The FFmpeg integration can be configured in `appsettings.json`:

```json
"FFmpeg": {
  "FFmpegPath": "",
  "AutoDownload": true,
  "FFmpegDownloadFolder": "ffmpeg",
  "ProgressUpdateIntervalMs": 5000
},
"TranscodingService": {
  "TempDirectory": "temp",
  "MaxConcurrentJobs": 2,
  "MaxConcurrentRenditions": 3,
  "OutputBaseDirectory": "transcoded",
  "OutputPathFormat": "{tenantId}/videos/{videoId}/{resolution}",
  "ManifestFormat": "{tenantId}/videos/{videoId}/manifest.m3u8",
  "AutoDownloadFFmpeg": true,
  "HlsSegmentDuration": 6,
  "GenerateDashManifest": true
}
```

## Transcoding Profiles

The service includes predefined transcoding profiles:

-   480p (SD): 854x480, 1 Mbps
-   720p (HD): 1280x720, 2.5 Mbps
-   1080p (Full HD): 1920x1080, 5 Mbps
-   4K (UHD): 3840x2160, 15 Mbps

Each profile includes optimized encoding parameters for quality and compatibility.

## Workflow

1. When a `VideoUploaded` event is received, `JobCreationHandlerService` invokes `TranscodingService.ProcessVideoAsync`
2. The service downloads the source file from S3 to a temporary location
3. For each rendition profile:
    - A new transcoding task is created
    - FFmpeg converts the video to the specified format
    - Progress is tracked and reported
4. HLS and DASH manifests are generated
5. All files are uploaded to S3
6. A `VideoTranscoded` event is published with manifest information

## Error Handling and Retry

-   Retries for failed S3 operations using Polly
-   Distributed locking via Redis to prevent duplicate processing
-   Job progress tracking for monitoring and debugging
-   Temporary file cleanup after processing

## Testing

-   Unit tests for FFmpegService and TranscodingService
-   Integration tests that can use real FFmpeg (optional)

## Dependencies

-   Xabe.FFmpeg: FFmpeg wrapper for .NET
-   Xabe.FFmpeg.Downloader: Automatic FFmpeg binary downloader
