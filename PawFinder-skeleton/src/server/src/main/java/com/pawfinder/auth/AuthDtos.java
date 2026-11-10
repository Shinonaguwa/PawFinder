package com.pawfinder.auth;

import java.time.Instant;
import java.util.Map;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(String name, String email, String password) {}
    public record LoginRequest(String email, String password) {}
    public record ForgotPasswordRequest(String email) {}
    public record ResetPasswordRequest(String token, String password) {}
    public record PublicUser(Long id, String name, String email, Instant createdAt) {}
    public record UserResponse(PublicUser user) {}
    public record LoginResponse(String token, PublicUser user) {}
    public record MessageResponse(String message) {}
    public record ErrorResponse(String error, Map<String, String> fields) {
        public ErrorResponse(String error) { this(error, Map.of()); }
    }

    public static PublicUser publicUser(User user) {
        return new PublicUser(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
    }
}
