const fs = require('fs');
const file = 'src/main/java/com/example/bephim/config/AuthorizationServerConfig.java';
let content = fs.readFileSync(file, 'utf8');

// In spring-security-oauth2-authorization-server 1.2+ (Spring Boot 3.2+), the configurers moved
content = content.replace(
  /import org\.springframework\.security\.oauth2\.server\.authorization\.config\.annotation\.web\.configuration\.OAuth2AuthorizationServerConfiguration;/g,
  `import org.springframework.security.oauth2.server.authorization.config.annotation.web.configuration.OAuth2AuthorizationServerConfiguration;`
);

content = content.replace(
  /import org\.springframework\.security\.oauth2\.server\.authorization\.config\.annotation\.web\.configurers\.OAuth2AuthorizationServerConfigurer;/g,
  `// using server configurers from auto config`
);

content = content.replace(
  /OAuth2AuthorizationServerConfigurer authorizationServerConfigurer =\s*OAuth2AuthorizationServerConfigurer\.authorizationServer\(\);/g,
  ``
);

content = content.replace(
  /\.securityMatcher\(authorizationServerConfigurer\.getEndpointsMatcher\(\)\)\s*\.with\(authorizationServerConfigurer, configurer ->\s*configurer\.oidc\(Customizer\.withDefaults\(\)\)\)/g,
  `.securityMatcher(OAuth2AuthorizationServerConfiguration.endpointsMatcher())
                .apply(new org.springframework.security.oauth2.server.authorization.config.annotation.web.configurers.OAuth2AuthorizationServerConfigurer())`
);

fs.writeFileSync(file, content);
