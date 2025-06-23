package com.training.blogapi.dto;

public class PostDto {
    private Long id;
    private String title;
    private String content;
    private String imagePath; // ← NEU

    public PostDto(Long id, String title, String content, String imagePath) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.imagePath = imagePath;
    }

    // Getter
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String getImagePath() { return imagePath; }
}
