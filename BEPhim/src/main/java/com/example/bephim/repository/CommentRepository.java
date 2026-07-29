package com.example.bephim.repository;

import com.example.bephim.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CommentRepository extends MongoRepository<Comment, String> {
    Page<Comment> findByMovieSlugAndHiddenFalseOrderByCreatedAtDesc(String movieSlug, Pageable pageable);
}
