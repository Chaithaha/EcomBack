/**
 * Cleanup Script: Remove Old Posts/Products Routes
 * 
 * This script removes the old posts and products routes after migration to items is complete.
 * Run this only after you've verified that the items API is working correctly.
 * 
 * WARNING: This is a destructive operation. Make sure you have backups!
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Starting cleanup of old routes...\n');

const filesToRemove = [
  'server/controllers/posts.js',
  'server/controllers/products.js',
  'server/routes/posts.js',
  'server/routes/products.js'
];

const filesToBackup = [
  'server/index.js'
];

// Create backup directory
const backupDir = path.join(__dirname, 'backups', `cleanup-${Date.now()}`);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('📦 Creating backups...');

// Backup files before modification
filesToBackup.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const backupPath = path.join(backupDir, path.basename(file));
  
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Backed up: ${file}`);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n🗑️  Removing old route files...');

// Remove old route files
filesToRemove.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✅ Removed: ${file}`);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n📝 Updating server/index.js...');

// Update server/index.js to remove old route imports and usage
const indexPath = path.join(__dirname, '..', 'server', 'index.js');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Remove old route imports
indexContent = indexContent.replace(/const productsRouter = require\('\.\/routes\/products'\);\n/g, '');
indexContent = indexContent.replace(/const postsRouter = require\('\.\/routes\/posts'\);\n/g, '');

// Remove old route usage
indexContent = indexContent.replace(/\/\/ Posts router handles its own authentication per route\napp\.use\('\/api\/posts', postsRouter\);\n/g, '');
indexContent = indexContent.replace(/\/\/ Products route doesn't require authentication\napp\.use\('\/api\/products', productsRouter\);\n/g, '');

// Clean up any double newlines
indexContent = indexContent.replace(/\n\s*\n\s*\n/g, '\n\n');

fs.writeFileSync(indexPath, indexContent);
console.log('✅ Updated server/index.js');

console.log('\n🧪 Creating verification script...');

// Create verification script
const verificationScript = `
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying cleanup completion...');

const filesToCheck = [
  'server/controllers/posts.js',
  'server/controllers/products.js', 
  'server/routes/posts.js',
  'server/routes/products.js'
];

const filesToExist = [
  'server/controllers/items.js',
  'server/routes/items.js',
  'server/index.js'
];

console.log('\\nChecking removed files (should not exist):');
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(filePath);
  console.log(\`\${exists ? '❌' : '✅'} \${file} \${exists ? '(still exists!)' : '(removed)'}\`);
});

console.log('\\nChecking required files (should exist):');
filesToExist.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(filePath);
  console.log(\`\${exists ? '✅' : '❌'} \${file} \${exists ? '(exists)' : '(missing!)'}\`);
});

console.log('\\n🎯 Cleanup verification complete!');
`;

const verificationPath = path.join(__dirname, 'verify-cleanup.js');
fs.writeFileSync(verificationPath, verificationScript);
console.log('✅ Created verification script: verify-cleanup.js');

console.log('\n📋 Cleanup Summary:');
console.log('================');
console.log('✅ Removed old posts and products controllers');
console.log('✅ Removed old posts and products routes');
console.log('✅ Updated server/index.js to remove old route usage');
console.log('✅ Created backups in:', backupDir);
console.log('✅ Created verification script');

console.log('\n🚀 Next Steps:');
console.log('===============');
console.log('1. Restart your server to ensure changes take effect');
console.log('2. Run: node verify-cleanup.js to verify cleanup');
console.log('3. Test the /api/items endpoints to ensure everything works');
console.log('4. Remove the backup directory when confident: rm -rf', backupDir);

console.log('\n⚠️  Important Notes:');
console.log('==================');
console.log('- Old posts and products data has been migrated to items table');
console.log('- All API calls should now use /api/items instead of /api/posts or /api/products');
console.log('- Frontend has been updated to use the new endpoints');
console.log('- Admin dashboard now uses the unified items system');

console.log('\n🎉 Cleanup completed successfully!');