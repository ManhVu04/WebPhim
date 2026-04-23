package com.example.bephim.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("favorites")
@CompoundIndex(name = "user_movie_idx", def = "{'userId': 1, 'movieSlug': 1}", unique = true)
public class Favorite {
    @Id
    private String id;

    private String userId;

    private String movieSlug;

    private Instant createdAt;

    // Metadata cached from OPhim (for display without extra API call)
    private String movieName;
    private String movieOriginName;
    private String thumbUrl;
    private String posterUrl;
    private Integer year;
}
