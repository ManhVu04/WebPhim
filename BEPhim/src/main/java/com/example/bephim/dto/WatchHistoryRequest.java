package com.example.bephim.dto;

import jakarta.validation.constraints.NotBlank;

public record WatchHistoryRequest(
        @NotBlank(message = "movieSlug is required")
        String movieSlug,
        String episodeSlug,
        Integer serverIndex,
        Integer episodeIndex,
        String movieName,
        String movieOriginName,
        String thumbUrl,
        String posterUrl,
        Integer year,
        String episodeName
) {
}
