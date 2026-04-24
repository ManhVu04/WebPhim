package com.example.bephim.repository;

import com.example.bephim.model.RefreshTokenDenylistEntry;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RefreshTokenDenylistRepository extends MongoRepository<RefreshTokenDenylistEntry, String> {
}
