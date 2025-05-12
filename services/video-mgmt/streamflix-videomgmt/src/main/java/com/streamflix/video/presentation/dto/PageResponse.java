package com.streamflix.video.presentation.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

import org.springframework.data.domain.Page;

/**
 * Wrapper for paginated API responses.
 * @param <T> Type of content in the page
 */
@Schema(description = "Paginated response wrapper for collections of items")
public class PageResponse<T> {
    @Schema(description = "List of items on the current page")
    private List<T> content;
    
    @Schema(description = "Total number of items across all pages", example = "42")
    private long totalElements;
    
    @Schema(description = "Total number of pages", example = "5")
    private int totalPages;
    
    @Schema(description = "Current page number (0-based)", example = "0")
    private int currentPage;
    
    @Schema(description = "Number of items per page", example = "10")
    private int pageSize;
    
    @Schema(description = "Whether this is the first page", example = "true")
    private boolean first;
    
    @Schema(description = "Whether this is the last page", example = "false")
    private boolean last;
    
    @Schema(description = "Whether the page is empty", example = "false")
    private boolean empty;

    // Default constructor
    public PageResponse() {}

    // Constructor from Spring Data Page
    public PageResponse(Page<T> page) {
        this.content = page.getContent();
        this.totalElements = page.getTotalElements();
        this.totalPages = page.getTotalPages();
        this.currentPage = page.getNumber();
        this.pageSize = page.getSize();
        this.first = page.isFirst();
        this.last = page.isLast();
        this.empty = page.isEmpty();
    }

    // Getters and setters
    public List<T> getContent() {
        return content;
    }

    public void setContent(List<T> content) {
        this.content = content;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }

    public int getCurrentPage() {
        return currentPage;
    }

    public void setCurrentPage(int currentPage) {
        this.currentPage = currentPage;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    public boolean isFirst() {
        return first;
    }

    public void setFirst(boolean first) {
        this.first = first;
    }

    public boolean isLast() {
        return last;
    }

    public void setLast(boolean last) {
        this.last = last;
    }

    public boolean isEmpty() {
        return empty;
    }

    public void setEmpty(boolean empty) {
        this.empty = empty;
    }
}