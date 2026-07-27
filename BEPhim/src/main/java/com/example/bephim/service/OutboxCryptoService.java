package com.example.bephim.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class OutboxCryptoService {

    private static final byte FORMAT_VERSION = 1;
    private static final int NONCE_LENGTH = 12;
    private static final int GCM_TAG_BITS = 128;
    private static final int MAX_FIELD_BYTES = 1_048_576;
    private static final byte[] AAD = "webphim-mail-outbox-v1".getBytes(StandardCharsets.UTF_8);

    private final SecureRandom secureRandom = new SecureRandom();
    private final SecretKeySpec key;

    public OutboxCryptoService(
            @Value("${app.mail.outbox.encryption-key:}") String encodedKey,
            @Value("${spring.mail.host:}") String mailHost) {
        if (!StringUtils.hasText(encodedKey)) {
            if (StringUtils.hasText(mailHost)) {
                throw new IllegalStateException(
                        "APP_MAIL_OUTBOX_ENCRYPTION_KEY is required when SMTP is configured");
            }
            this.key = null;
            return;
        }

        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(encodedKey.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Mail outbox encryption key must be valid Base64", e);
        }
        if (keyBytes.length != 32) {
            throw new IllegalStateException("Mail outbox encryption key must decode to 32 bytes");
        }
        this.key = new SecretKeySpec(keyBytes, "AES");
    }

    public boolean isConfigured() {
        return key != null;
    }

    public String encrypt(MailMessagePayload payload) {
        requireKey();
        byte[] nonce = new byte[NONCE_LENGTH];
        secureRandom.nextBytes(nonce);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, nonce));
            cipher.updateAAD(AAD);
            byte[] ciphertext = cipher.doFinal(serialize(payload));

            ByteArrayOutputStream result = new ByteArrayOutputStream(1 + nonce.length + ciphertext.length);
            result.write(FORMAT_VERSION);
            result.write(nonce);
            result.write(ciphertext);
            return Base64.getEncoder().encodeToString(result.toByteArray());
        } catch (GeneralSecurityException | IOException e) {
            throw new IllegalStateException("Could not encrypt mail outbox payload", e);
        }
    }

    public MailMessagePayload decrypt(String encryptedPayload) {
        requireKey();
        try {
            byte[] envelope = Base64.getDecoder().decode(encryptedPayload);
            if (envelope.length <= 1 + NONCE_LENGTH || envelope[0] != FORMAT_VERSION) {
                throw new IllegalArgumentException("Unsupported mail outbox payload");
            }
            byte[] nonce = new byte[NONCE_LENGTH];
            System.arraycopy(envelope, 1, nonce, 0, NONCE_LENGTH);
            byte[] ciphertext = new byte[envelope.length - 1 - NONCE_LENGTH];
            System.arraycopy(envelope, 1 + NONCE_LENGTH, ciphertext, 0, ciphertext.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, nonce));
            cipher.updateAAD(AAD);
            return deserialize(cipher.doFinal(ciphertext));
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            throw new IllegalStateException("Could not decrypt mail outbox payload", e);
        }
    }

    private void requireKey() {
        if (key == null) {
            throw new IllegalStateException("Mail outbox encryption is not configured");
        }
    }

    private static byte[] serialize(MailMessagePayload payload) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        try (DataOutputStream output = new DataOutputStream(buffer)) {
            writeString(output, payload.to());
            writeString(output, payload.subject());
            writeString(output, payload.text());
        }
        return buffer.toByteArray();
    }

    private static MailMessagePayload deserialize(byte[] bytes) throws IOException {
        try (DataInputStream input = new DataInputStream(new ByteArrayInputStream(bytes))) {
            MailMessagePayload payload = new MailMessagePayload(
                    readString(input),
                    readString(input),
                    readString(input));
            if (input.available() != 0) {
                throw new IOException("Unexpected trailing mail payload data");
            }
            return payload;
        }
    }

    private static void writeString(DataOutputStream output, String value) throws IOException {
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_FIELD_BYTES) {
            throw new IOException("Mail payload field is too large");
        }
        output.writeInt(bytes.length);
        output.write(bytes);
    }

    private static String readString(DataInputStream input) throws IOException {
        int length = input.readInt();
        if (length < 0 || length > MAX_FIELD_BYTES) {
            throw new IOException("Invalid mail payload field length");
        }
        byte[] bytes = input.readNBytes(length);
        if (bytes.length != length) {
            throw new IOException("Truncated mail payload field");
        }
        return new String(bytes, StandardCharsets.UTF_8);
    }
}
