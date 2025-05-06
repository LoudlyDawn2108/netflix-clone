-- Create Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);
-- Create Videos Table
CREATE TABLE videos (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID,
    status VARCHAR(50) NOT NULL,
    release_year INTEGER,
    language VARCHAR(10),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
-- Create Video Tags Table (for many-to-many relationship between videos and tags)
CREATE TABLE video_tags (
    video_id UUID NOT NULL,
    tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (video_id, tag),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);
-- Create Thumbnails Table
CREATE TABLE thumbnails (
    id UUID PRIMARY KEY,
    video_id UUID NOT NULL,
    url VARCHAR(2048) NOT NULL,
    width INTEGER,
    height INTEGER,
    is_default BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);
-- Create indexes for common queries
CREATE INDEX idx_videos_category_id ON videos(category_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_release_year ON videos(release_year);
CREATE INDEX idx_videos_language ON videos(language);
CREATE INDEX idx_video_tags_tag ON video_tags(tag);
CREATE INDEX idx_thumbnails_video_id ON thumbnails(video_id);