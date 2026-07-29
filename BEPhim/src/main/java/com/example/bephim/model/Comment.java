package com.example.bephim.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("comments")
public class Comment {
    @Id
    private String id;

    private String movieSlug;
    private String userId;
    private String username;
    private String displayName;
    private String content;
    private Instant createdAt;
    private boolean hidden = false;
    private Instant hiddenAt;
    private String hiddenByUserId;
}
