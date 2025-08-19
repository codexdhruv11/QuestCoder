const fs = require('fs');
const path = require('path');

// Fix JWT configuration
const jwtPath = 'src/config/jwt.ts';
let jwtContent = fs.readFileSync(jwtPath, 'utf8');
// Change the type annotations to use 'as const' assertions
jwtContent = jwtContent.replace(
  "const JWT_EXPIRES_IN: string | number = process.env['JWT_EXPIRES_IN'] || '7d'",
  "const JWT_EXPIRES_IN = (process.env['JWT_EXPIRES_IN'] || '7d') as string"
);
jwtContent = jwtContent.replace(
  "const JWT_REFRESH_EXPIRES_IN: string | number = process.env['JWT_REFRESH_EXPIRES_IN'] || '30d'",
  "const JWT_REFRESH_EXPIRES_IN = (process.env['JWT_REFRESH_EXPIRES_IN'] || '30d') as string"
);
fs.writeFileSync(jwtPath, jwtContent, 'utf8');
console.log('✓ Fixed JWT config');

// Clean up temporary files
const filesToDelete = ['fix-models.cjs', 'fix-models-v2.cjs'];
filesToDelete.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`✓ Deleted ${file}`);
  }
});

console.log('Cleanup completed!');
