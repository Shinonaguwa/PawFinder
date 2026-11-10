package com.pawfinder.common;

import com.pawfinder.auth.AuthDtos;
import com.pawfinder.auth.AuthValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(AuthValidationException.class)
    ResponseEntity<AuthDtos.ErrorResponse> validation(AuthValidationException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(new AuthDtos.ErrorResponse(exception.getMessage(), exception.getFields()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<AuthDtos.ErrorResponse> status(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .body(new AuthDtos.ErrorResponse(exception.getReason() == null ? "Request failed." : exception.getReason()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<AuthDtos.ErrorResponse> malformedJson() {
        return ResponseEntity.badRequest().body(new AuthDtos.ErrorResponse("Request body is not valid JSON."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<AuthDtos.ErrorResponse> unexpected(Exception exception) {
        exception.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthDtos.ErrorResponse("Something went wrong."));
    }
}
