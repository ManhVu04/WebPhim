package com.example.bephim.repository;

import com.example.bephim.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CommentRepository extends MongoRepository<Comment, String> {
    Page<Comment> findByMovieSlugAndHiddenFalseOrderByCreatedAtDesc(String movieSlug, Pageable pageable);

    Page<Comment> findByHidden(boolean hidden, Pageable pageable);

    Page<Comment> findByMovieSlugContainingIgnoreCaseOrUsernameContainingIgnoreCaseOrContentContainingIgnoreCase(
            String movieSlug, String username, String content, Pageable pageable);

    Page<Comment> findByHiddenAndMovieSlugContainingIgnoreCaseOrHiddenAndUsernameContainingIgnoreCaseOrHiddenAndContentContainingIgnoreCase(
            boolean hidden1, String movieSlug, boolean hidden2, String username, boolean hidden3, String content, Pageable pageable);

    long countByHiddenTrue();
}
