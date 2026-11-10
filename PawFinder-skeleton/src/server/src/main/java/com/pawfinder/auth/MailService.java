package com.pawfinder.auth;

public interface MailService {
    void send(String to, String subject, String text);
}
