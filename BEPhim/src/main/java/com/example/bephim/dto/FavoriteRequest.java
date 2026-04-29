package com.example.bephim.dto;

import jakarta.validation.constraints.NotBlank;

public record FavoriteRequest(
        @NotBlank(message = "movieSlug is required")
        String movieSlug,
        String movieName,
        String movieOriginName,
        String thumbUrl,
        String posterUrl,
        Integer year
) {
}
