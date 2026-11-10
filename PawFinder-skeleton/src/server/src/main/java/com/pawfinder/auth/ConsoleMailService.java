package com.pawfinder.auth;

import org.springframework.stereotype.Service;

@Service
public class ConsoleMailService implements MailService {
    @Override
    public void send(String to, String subject, String text) {
        System.out.printf("%n--- Email (not actually sent) ---%nTo: %s%nSubject: %s%n%n%s%n---------------------------------%n%n",
                to, subject, text);
    }
}
