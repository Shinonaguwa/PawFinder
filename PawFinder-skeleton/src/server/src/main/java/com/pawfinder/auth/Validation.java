package com.pawfinder.auth;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

final class Validation {
    static final int MIN_PASSWORD_LENGTH = 8;
    static final int MAX_PASSWORD_BYTES = 72;
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private Validation() {}

    static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    static Map<String, String> registrationErrors(AuthDtos.RegisterRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (request == null || request.name() == null || request.name().trim().isEmpty()) {
            errors.put("name", "Name is required.");
        } else if (request.name().trim().length() > 100) {
            errors.put("name", "Name must be 100 characters or fewer.");
        }

        String email = request == null ? "" : normalizeEmail(request.email());
        if (email.isEmpty()) errors.put("email", "Email is required.");
        else if (email.length() > 254 || !EMAIL.matcher(email).matches()) {
            errors.put("email", "Enter a valid email address.");
        }

        String passwordError = passwordError(request == null ? null : request.password());
        if (passwordError != null) errors.put("password", passwordError);
        return errors;
    }

    static String passwordError(String password) {
        if (password == null || password.isEmpty()) return "Password is required.";
        if (password.length() < MIN_PASSWORD_LENGTH) {
            return "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.";
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            return "Password must be at most " + MAX_PASSWORD_BYTES + " bytes.";
        }
        return null;
    }
}
