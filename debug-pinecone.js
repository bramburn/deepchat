/**
 * Debug script to test Pinecone connection
 * Run this with: node debug-pinecone.js
 */

const { Pinecone } = require('@pinecone-database/pinecone');

async function testPineconeConnection() {
  console.log('=== Pinecone Connection Debug Script ===\n');
  
  // Get API key from command line argument or prompt user
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('Usage: node debug-pinecone.js <your-pinecone-api-key>');
    console.log('Example: node debug-pinecone.js pc-abc123...');
    process.exit(1);
  }
  
  console.log('API Key format check:');
  console.log(`- Length: ${apiKey.length}`);
  console.log(`- Starts with 'pc-': ${apiKey.startsWith('pc-')}`);
  console.log(`- Starts with 'sk-': ${apiKey.startsWith('sk-')}`);
  console.log(`- First 10 chars: ${apiKey.substring(0, 10)}...`);
  console.log('');
  
  try {
    console.log('Creating Pinecone client...');
    const pinecone = new Pinecone({
      apiKey: apiKey.trim()
    });
    
    console.log('Testing connection by listing indexes...');
    const indexes = await pinecone.listIndexes();
    
    console.log('✅ SUCCESS! Pinecone connection working.');
    console.log(`Found ${indexes.indexes?.length || 0} indexes:`);
    
    if (indexes.indexes && indexes.indexes.length > 0) {
      indexes.indexes.forEach((index, i) => {
        console.log(`  ${i + 1}. ${index.name} (${index.dimension} dimensions, ${index.metric} metric)`);
      });
    } else {
      console.log('  No indexes found. You may need to create an index first.');
    }
    
  } catch (error) {
    console.log('❌ FAILED! Pinecone connection error:');
    console.log(`Error type: ${error.constructor.name}`);
    console.log(`Error message: ${error.message}`);
    console.log(`Error code: ${error.code || error.status || 'N/A'}`);
    
    if (error.response) {
      console.log(`HTTP Status: ${error.response.status}`);
      console.log(`HTTP Status Text: ${error.response.statusText}`);
    }
    
    console.log('\nFull error object:');
    console.log(error);
    
    console.log('\n=== Troubleshooting Tips ===');
    console.log('1. Check that your API key is correct');
    console.log('2. Ensure your Pinecone account is active');
    console.log('3. Verify you have internet connectivity');
    console.log('4. Check if you need to create an index first');
    console.log('5. Make sure your API key has the right permissions');
  }
}

testPineconeConnection();
