package com.example.bephim.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${app.mail.from:}")
    private String mailFrom;

    public void sendEmailVerification(String to, String verificationUrl) {
        send(to, "Verify your WebPhim email", """
                Welcome to WebPhim.

                Verify your email address:
                %s

                This link expires in 24 hours.
                """.formatted(verificationUrl));
    }

    public void sendPasswordReset(String to, String resetUrl) {
        send(to, "Reset your WebPhim password", """
                A password reset was requested for your WebPhim account.

                Reset your password:
                %s

                This link expires in 30 minutes. Ignore this email if you did not request it.
                """.formatted(resetUrl));
    }

    private void send(String to, String subject, String text) {
        if (!StringUtils.hasText(mailHost) || !StringUtils.hasText(mailFrom)) {
            log.warn("Mail is not configured; skipping email '{}'", subject);
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("JavaMailSender is not available; skipping email '{}'", subject);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }
}
