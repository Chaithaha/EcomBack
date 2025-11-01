const fs = require('fs');
const path = require('path');

// Create a simple test image (1x1 pixel PNG)
const createTestImage = () => {
  const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  return base64Image;
};

// Test the unified item creation endpoint
const testItemCreation = async () => {
  try {
    console.log('Testing unified item creation with image upload...');
    
    // Read test token
    const testToken = fs.readFileSync('test-token.txt', 'utf8').trim();
    
    const testData = {
      title: 'Test Item with Image',
      description: 'This is a test item to verify the unified image upload system works',
      price: 99.99,
      category: 'Electronics',
      images: [
        {
          base64: createTestImage(),
          originalname: 'test-image.png',
          mimetype: 'image/png'
        }
      ]
    };
    
    console.log('Sending test data:', {
      ...testData,
      images: testData.images.map(img => ({
        ...img,
        base64: img.base64.substring(0, 50) + '...'
      }))
    });
    
    console.log('Using auth token:', testToken.substring(0, 50) + '...');
    
    const response = await fetch('http://localhost:5000/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', result);
    
    if (response.ok && result.id) {
      console.log('✅ SUCCESS: Item created with image!');
      console.log('Item ID:', result.id);
      console.log('Image URL:', result.image_url);
      console.log('Images count:', result.images?.length || 0);
    } else {
      console.log('❌ FAILED: Item creation failed');
      console.log('Error:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ ERROR: Test failed', error.message);
  }
};

// Run the test
testItemCreation();