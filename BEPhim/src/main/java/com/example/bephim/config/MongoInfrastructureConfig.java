package com.example.bephim.config;

import com.example.bephim.model.Comment;
import com.example.bephim.model.Favorite;
import com.example.bephim.model.MailOutboxEntry;
import com.example.bephim.model.WatchHistory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.MongoTransactionManager;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Duration;

@Configuration
@EnableScheduling
public class MongoInfrastructureConfig {

    @Bean
    MongoTransactionManager mongoTransactionManager(MongoDatabaseFactory databaseFactory) {
        return new MongoTransactionManager(databaseFactory);
    }

    @Bean
    ApplicationRunner ensureMongoIndexes(MongoTemplate mongoTemplate) {
        return args -> {
            mongoTemplate.indexOps(Favorite.class).createIndex(
                    new Index()
                            .on("userId", Sort.Direction.ASC)
                            .on("createdAt", Sort.Direction.DESC)
                            .named("user_created_at_idx"));
            mongoTemplate.indexOps(WatchHistory.class).createIndex(
                    new Index()
                            .on("userId", Sort.Direction.ASC)
                            .on("watchedAt", Sort.Direction.DESC)
                            .named("user_watched_at_idx"));
            mongoTemplate.indexOps(Comment.class).createIndex(
                    new Index()
                            .on("movieSlug", Sort.Direction.ASC)
                            .on("hidden", Sort.Direction.ASC)
                            .on("createdAt", Sort.Direction.DESC)
                            .named("movie_visible_created_at_idx"));
            mongoTemplate.indexOps(Comment.class).createIndex(
                    new Index()
                            .on("userId", Sort.Direction.ASC)
                            .on("createdAt", Sort.Direction.DESC)
                            .named("comment_user_created_at_idx"));
            mongoTemplate.indexOps(MailOutboxEntry.class).createIndex(
                    new Index()
                            .on("status", Sort.Direction.ASC)
                            .on("nextAttemptAt", Sort.Direction.ASC)
                            .named("status_next_attempt_idx"));
            mongoTemplate.indexOps(MailOutboxEntry.class).createIndex(
                    new Index()
                            .on("status", Sort.Direction.ASC)
                            .on("lockedUntil", Sort.Direction.ASC)
                            .named("status_locked_until_idx"));
            mongoTemplate.indexOps(MailOutboxEntry.class).createIndex(
                    new Index()
                            .on("sentAt", Sort.Direction.ASC)
                            .expire(Duration.ofDays(7))
                            .named("sent_mail_ttl_idx"));
        };
    }
}
