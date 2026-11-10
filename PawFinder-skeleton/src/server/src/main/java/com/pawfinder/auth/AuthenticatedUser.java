package com.pawfinder.auth;

public record AuthenticatedUser(User user, String jti, long expiresAtEpochSeconds) {}
