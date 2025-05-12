namespace Streamflix.Transcoding.Core.Interfaces;

public interface ITranscodingProfile
{
    string Name { get; }
    string Resolution { get; }
    int Width { get; }
    int Height { get; }
    int Bitrate { get; }
    string VideoCodec { get; }
    string AudioCodec { get; }
    string Preset { get; }
    string[] AdditionalParameters { get; }
}

public class TranscodingProfile : ITranscodingProfile
{
    public string Name { get; set; } = string.Empty;
    public string Resolution { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
    public int Bitrate { get; set; }
    public string VideoCodec { get; set; } = "libx264";
    public string AudioCodec { get; set; } = "aac";
    public string Preset { get; set; } = "medium";
    public string[] AdditionalParameters { get; set; } = Array.Empty<string>();
}

public static class PredefinedProfiles
{
    public static readonly ITranscodingProfile[] DefaultProfiles = new ITranscodingProfile[]
    {
        new TranscodingProfile 
        { 
            Name = "480p",
            Resolution = "480p", 
            Width = 854, 
            Height = 480, 
            Bitrate = 1000000, // 1 Mbps
            VideoCodec = "libx264",
            AudioCodec = "aac",
            Preset = "medium",
            AdditionalParameters = new[] { "-profile:v main", "-level 3.1", "-crf 23", "-ar 44100", "-b:a 128k" }
        },
        new TranscodingProfile 
        { 
            Name = "720p",
            Resolution = "720p", 
            Width = 1280, 
            Height = 720, 
            Bitrate = 2500000, // 2.5 Mbps
            VideoCodec = "libx264",
            AudioCodec = "aac",
            Preset = "medium",
            AdditionalParameters = new[] { "-profile:v high", "-level 4.0", "-crf 22", "-ar 44100", "-b:a 192k" }
        },
        new TranscodingProfile 
        { 
            Name = "1080p",
            Resolution = "1080p", 
            Width = 1920, 
            Height = 1080, 
            Bitrate = 5000000, // 5 Mbps
            VideoCodec = "libx264",
            AudioCodec = "aac",
            Preset = "medium",
            AdditionalParameters = new[] { "-profile:v high", "-level 4.2", "-crf 21", "-ar 48000", "-b:a 192k" }
        },
        new TranscodingProfile 
        { 
            Name = "4K",
            Resolution = "4K", 
            Width = 3840, 
            Height = 2160, 
            Bitrate = 15000000, // 15 Mbps
            VideoCodec = "libx264",
            AudioCodec = "aac",
            Preset = "slow",
            AdditionalParameters = new[] { "-profile:v high", "-level 5.1", "-crf 20", "-ar 48000", "-b:a 320k" }
        }
    };
}