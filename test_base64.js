// Test base64 encoding/decoding
const testString = "Hello World! This is a test file content.";
const buffer = Buffer.from(testString, 'utf-8');
const base64 = buffer.toString('base64');
console.log('Original:', testString);
console.log('Base64:', base64);
console.log('Decoded:', Buffer.from(base64, 'base64').toString('utf-8'));
console.log('Buffer length:', Buffer.from(base64, 'base64').length);
