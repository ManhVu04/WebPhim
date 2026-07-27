package com.example.bephim.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record FavoriteRequest(
        @NotBlank(message = "movieSlug is required")
        @Size(max = 200, message = "movieSlug must be at most 200 characters")
        String movieSlug,
        @Size(max = 300, message = "movieName must be at most 300 characters")
        String movieName,
        @Size(max = 300, message = "movieOriginName must be at most 300 characters")
        String movieOriginName,
        @Size(max = 2048, message = "thumbUrl must be at most 2048 characters")
        String thumbUrl,
        @Size(max = 2048, message = "posterUrl must be at most 2048 characters")
        String posterUrl,
        @Min(value = 1888, message = "year must be at least 1888")
        @Max(value = 2100, message = "year must be at most 2100")
        Integer year
) {
}
