package com.example.bephim.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentReportRequest(
        @NotBlank(message = "reason is required")
        @Size(max = 100, message = "reason must be at most 100 characters")
        String reason,

        @Size(max = 500, message = "details must be at most 500 characters")
        String details
) {
}
