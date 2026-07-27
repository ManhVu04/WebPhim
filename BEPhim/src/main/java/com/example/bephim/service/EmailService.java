package com.example.bephim.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${app.mail.from:}")
    private String mailFrom;

    public boolean isConfigured() {
        return StringUtils.hasText(mailHost)
                && StringUtils.hasText(mailFrom)
                && mailSenderProvider.getIfAvailable() != null;
    }

    public void send(MailMessagePayload payload) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (!StringUtils.hasText(mailHost) || !StringUtils.hasText(mailFrom) || mailSender == null) {
            throw new IllegalStateException("Mail delivery is not configured");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(payload.to());
        message.setSubject(payload.subject());
        message.setText(payload.text());
        mailSender.send(message);
    }
}
