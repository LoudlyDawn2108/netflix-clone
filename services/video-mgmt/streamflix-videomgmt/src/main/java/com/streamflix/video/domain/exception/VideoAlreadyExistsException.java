package com.streamflix.video.domain.exception;

/**
 * Exception thrown when attempting to create a video that already exists.
 */
public class VideoAlreadyExistsException extends RuntimeException {

    private final String title;

    public VideoAlreadyExistsException(String title) {
        super("Video already exists with title: " + title);
        this.title = title;
    }

    public String getTitle() {
        return title;
    }
}