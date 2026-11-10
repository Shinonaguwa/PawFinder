package com.pawfinder.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;

@Service
public class AuthService {
    public static final String INVALID_RESET = "This reset link is invalid or has expired. Request a new one.";
    private static final String FORGOT_REPLY = "If an account exists for that email, a reset link has been sent.";

    private final UserRepository users;
    private final RevokedTokenRepository revokedTokens;
    private final PasswordResetTokenRepository resets;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;
    private final String appUrl;
    private final Duration resetDuration;
    private final String decoyPasswordHash;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository users, RevokedTokenRepository revokedTokens,
                       PasswordResetTokenRepository resets, PasswordEncoder passwordEncoder,
                       JwtService jwtService, MailService mailService,
                       @Value("${pawfinder.app-url:http://localhost:5173}") String appUrl,
                       @Value("${pawfinder.reset-token-minutes:60}") long resetMinutes) {
        this.users = users;
        this.revokedTokens = revokedTokens;
        this.resets = resets;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.appUrl = appUrl.replaceAll("/+$", "");
        this.resetDuration = Duration.ofMinutes(resetMinutes);
        this.decoyPasswordHash = passwordEncoder.encode("pawfinder-login-timing-decoy");
    }

    @Transactional
    public User register(AuthDtos.RegisterRequest request) {
        Map<String, String> errors = Validation.registrationErrors(request);
        if (!errors.isEmpty()) throw new AuthValidationException("Please fix the highlighted fields.", errors);

        String email = Validation.normalizeEmail(request.email());
        if (users.existsByEmail(email)) throw duplicateEmail();
        try {
            return users.saveAndFlush(new User(request.name().trim(), email, passwordEncoder.encode(request.password())));
        } catch (DataIntegrityViolationException exception) {
            throw duplicateEmail();
        }
    }

    public AuthDtos.LoginResponse login(AuthDtos.LoginRequest request) {
        String email = Validation.normalizeEmail(request == null ? null : request.email());
        String password = request == null ? null : request.password();
        if (email.isEmpty() || password == null || password.isEmpty()) {
            throw new AuthValidationException("Enter your email and password.");
        }
        User user = users.findByEmail(email).orElse(null);
        boolean passwordMatches = passwordEncoder.matches(password, user == null ? decoyPasswordHash : user.getPasswordHash());
        if (user == null || !passwordMatches) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password.");
        }
        return new AuthDtos.LoginResponse(jwtService.createToken(user), AuthDtos.publicUser(user));
    }

    @Transactional
    public void logout(AuthenticatedUser principal) {
        revokedTokens.save(new RevokedToken(principal.jti(), Instant.ofEpochSecond(principal.expiresAtEpochSeconds())));
        revokedTokens.deleteByExpiresAtBefore(Instant.now());
    }

    @Transactional
    public String forgotPassword(AuthDtos.ForgotPasswordRequest request) {
        String email = Validation.normalizeEmail(request == null ? null : request.email());
        if (email.isEmpty()) throw new AuthValidationException("Enter your email address.");

        users.findByEmail(email).ifPresent(user -> {
            Instant now = Instant.now();
            resets.findAllByUserAndUsedAtIsNull(user).forEach(reset -> reset.markUsed(now));
            byte[] raw = new byte[32];
            random.nextBytes(raw);
            String token = HexFormat.of().formatHex(raw);
            resets.save(new PasswordResetToken(user, sha256(token), now.plus(resetDuration)));
            try {
                mailService.send(user.getEmail(), "Reset your PawFinder password",
                        "Someone asked to reset the password for your PawFinder account.\n\n" +
                        "Open this link to choose a new password (it works once and expires in " +
                        resetDuration.toMinutes() + " minutes):\n" + appUrl + "/?reset=" + token + "\n\n" +
                        "If you did not ask for this, you can ignore this email. Your password has not changed.");
            } catch (RuntimeException ignored) {
                // The response deliberately does not reveal whether an account or email delivery exists.
            }
        });
        return FORGOT_REPLY;
    }

    @Transactional
    public String resetPassword(AuthDtos.ResetPasswordRequest request) {
        String token = request == null ? null : request.token();
        if (token == null || token.isEmpty()) throw invalidReset();
        String passwordError = Validation.passwordError(request.password());
        if (passwordError != null) {
            throw new AuthValidationException(passwordError, Map.of("password", passwordError));
        }

        Instant now = Instant.now();
        PasswordResetToken reset = resets.findByTokenHash(sha256(token))
                .filter(found -> found.isUsableAt(now))
                .orElseThrow(AuthService::invalidReset);
        User user = reset.getUser();
        reset.markUsed(now);
        resets.findAllByUserAndUsedAtIsNull(user).forEach(other -> other.markUsed(now));
        user.changePassword(passwordEncoder.encode(request.password()));
        return "Your password has been changed. Log in with your new password.";
    }

    private static AuthValidationException duplicateEmail() {
        return new AuthValidationException("An account with this email already exists.",
                Map.of("email", "Already registered."), HttpStatus.CONFLICT);
    }

    private static AuthValidationException invalidReset() {
        return new AuthValidationException(INVALID_RESET);
    }

    static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
