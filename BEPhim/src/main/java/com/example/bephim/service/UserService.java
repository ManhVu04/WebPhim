package com.example.bephim.service;

import com.example.bephim.model.User;
import com.example.bephim.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        List<SimpleGrantedAuthority> authorities = user.getRoles() == null
                ? List.of(new SimpleGrantedAuthority("ROLE_USER"))
                : user.getRoles().stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList();

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .authorities(authorities)
                .build();
    }

    public User register(String username, String password, String displayName) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (username == null || username.trim().length() < 3) {
            throw new IllegalArgumentException("Username must be at least 3 characters");
        }
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        User user = new User();
        user.setUsername(username.trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(password));
        user.setDisplayName(displayName != null ? displayName.trim() : username);
        user.setRoles(List.of("USER"));
        user.setCreatedAt(Instant.now());
        return userRepository.save(user);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }

    public User findById(String id) {
        return userRepository.findById(id).orElse(null);
    }

    /**
     * Revoke all existing tokens by incrementing the refresh token version.
     * This effectively logs out the user from all devices.
     */
    public void revokeAllTokens(String userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            int currentVersion = user.getRefreshTokenVersion();
            user.setRefreshTokenVersion(currentVersion + 1);
            userRepository.save(user);
        }
    }
}
