package com.example.bephim.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentRequest(
        @NotBlank(message = "movieSlug is required")
        @Size(max = 200, message = "movieSlug must be at most 200 characters")
        String movieSlug,
        @NotBlank(message = "content is required")
        @Size(max = 1000, message = "content must be at most 1000 characters")
        String content
) {
}
