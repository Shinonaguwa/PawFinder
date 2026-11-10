package com.pawfinder.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthDtos.UserResponse register(@RequestBody(required = false) AuthDtos.RegisterRequest request) {
        return new AuthDtos.UserResponse(AuthDtos.publicUser(authService.register(request)));
    }

    @PostMapping("/login")
    public AuthDtos.LoginResponse login(@RequestBody(required = false) AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public AuthDtos.UserResponse me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return new AuthDtos.UserResponse(AuthDtos.publicUser(principal.user()));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal AuthenticatedUser principal) {
        authService.logout(principal);
    }

    @PostMapping("/forgot-password")
    public AuthDtos.MessageResponse forgotPassword(@RequestBody(required = false) AuthDtos.ForgotPasswordRequest request) {
        return new AuthDtos.MessageResponse(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    public AuthDtos.MessageResponse resetPassword(@RequestBody(required = false) AuthDtos.ResetPasswordRequest request) {
        return new AuthDtos.MessageResponse(authService.resetPassword(request));
    }
}
