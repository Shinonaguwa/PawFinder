package com.pawfinder.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, String> {
    long deleteByExpiresAtBefore(Instant now);
}
