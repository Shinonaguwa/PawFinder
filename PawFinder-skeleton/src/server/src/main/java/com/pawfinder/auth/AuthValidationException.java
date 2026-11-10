package com.pawfinder.auth;

import org.springframework.http.HttpStatus;
import java.util.Map;

public class AuthValidationException extends RuntimeException {
    private final Map<String, String> fields;
    private final HttpStatus status;

    public AuthValidationException(String message) {
        this(message, Map.of(), HttpStatus.BAD_REQUEST);
    }

    public AuthValidationException(String message, Map<String, String> fields) {
        this(message, fields, HttpStatus.BAD_REQUEST);
    }

    public AuthValidationException(String message, Map<String, String> fields, HttpStatus status) {
        super(message);
        this.fields = Map.copyOf(fields);
        this.status = status;
    }

    public Map<String, String> getFields() { return fields; }
    public HttpStatus getStatus() { return status; }
}
