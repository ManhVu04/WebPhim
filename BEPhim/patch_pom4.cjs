const fs = require('fs');
const file = 'pom.xml';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<artifactId>spring-boot-starter-oauth2-authorization-server<\/artifactId>\s*<version>3\.2\.4<\/version>/g,
  '<artifactId>spring-boot-starter-oauth2-authorization-server</artifactId>'
);

fs.writeFileSync(file, content);
