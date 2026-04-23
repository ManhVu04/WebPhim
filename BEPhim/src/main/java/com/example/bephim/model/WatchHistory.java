package com.example.bephim.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("watch_history")
@CompoundIndex(name = "user_movie_ep_idx", def = "{'userId': 1, 'movieSlug': 1, 'episodeSlug': 1}", unique = true)
public class WatchHistory {
    @Id
    private String id;

    private String userId;

    private String movieSlug;

    private String episodeSlug;

    private int serverIndex;

    private int episodeIndex;

    private Instant watchedAt;

    // Metadata cached from OPhim (for display without extra API call)
    private String movieName;
    private String movieOriginName;
    private String thumbUrl;
    private String posterUrl;
    private Integer year;
    private String episodeName;
}
