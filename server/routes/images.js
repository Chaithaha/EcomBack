const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { authenticateToken } = require('../middleware/auth');
const { getSupabaseServiceClient, getSupabaseClient } = require('../utils/supabase');

// Error handling middleware for image uploads
router.use((error, req, res, next) => {
    if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('File too large')) {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
        if (error.message.includes('Too many files')) {
            return res.status(400).json({ error: 'Too many files. Maximum is 5 files.' });
        }
        if (error.message.includes('Invalid file data format')) {
            return res.status(400).json({ error: 'Invalid file format. Please upload valid image files.' });
        }
        return res.status(400).json({ error: error.message });
    }
    next();
});

// GET /api/images/:postId - Get all images for a specific post
router.get('/:postId', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;
        console.log(`=== Fetching images for post: ${postId} ===`);
        const supabase = getSupabaseServiceClient();

        const { data: images, error } = await supabase
            .from('post_images')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('❌ Error fetching images from database:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log(`Found ${images.length} images in database`);

        // Add public URLs to images using the reliable getPublicUrl method
        const imagesWithUrls = images.map((image, index) => {
            console.log(`\n--- Processing image ${index + 1}: ${image.filename} ---`);
            console.log(`Storage path: ${image.storage_path}`);
            
            const { data: publicUrlData } = supabase.storage
                .from('post-images')
                .getPublicUrl(image.storage_path);
            
            const fullUrl = publicUrlData.publicUrl;
            console.log(`Generated URL: ${fullUrl}`);
            console.log(`URL validation - starts with Supabase URL: ${fullUrl.startsWith(process.env.SUPABASE_URL || 'https://')}`);
            
            return { ...image, public_url: fullUrl };
        });

        console.log(`✅ Successfully processed ${imagesWithUrls.length} images`);
        res.json(imagesWithUrls);
    } catch (error) {
        console.error('❌ Error fetching images:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/images/:id - Delete a specific image from Supabase Storage
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseServiceClient();

        // First get the image record to get the storage path
        const { data: image, error: fetchError } = await supabase
            .from('post_images')
            .select('storage_path, post_id')
            .eq('id', id)
            .single();

        if (fetchError) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Verify user owns the post (for security)
        const { data: post } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', image.post_id)
            .single();

        if (!post || post.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to delete this image' });
        }

        // Delete the file from Supabase Storage
        const { error: storageError } = await supabase.storage
            .from('post-images')
            .remove([image.storage_path]);

        if (storageError) {
            console.error('Error deleting from storage:', storageError);
            // Continue with database deletion even if storage deletion fails
        }

        // Delete the image record from database
        const { error: deleteError } = await supabase
            .from('post_images')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return res.status(400).json({ error: deleteError.message });
        }

        console.log(`Successfully deleted image ${id} from storage and database`);
        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Test endpoint to verify routing
router.get('/test-metadata', (req, res) => {
    res.json({ success: true, message: 'Metadata endpoint is working' });
});

// POST /api/images/store-metadata - Store image metadata in database
router.post('/store-metadata', authenticateToken, async (req, res) => {
    try {
        const { postId, images } = req.body;
        const supabase = getSupabaseServiceClient();
        
        console.log(`Storing metadata for ${images.length} images for post ${postId}`);
        
        const imageRecords = images.map(image => ({
            post_id: postId,
            storage_path: image.storage_path,
            filename: image.filename,
            original_filename: image.original_filename,
            file_size: image.file_size,
            mime_type: image.mime_type,
            image_url: image.image_url
        }));
        
        const { data, error } = await supabase
            .from('post_images')
            .insert(imageRecords)
            .select();
        
        if (error) {
            console.error('Error storing image metadata:', error);
            return res.status(400).json({ error: error.message });
        }
        
        // Update post with primary image URL
        if (images.length > 0) {
            const primaryImageUrl = images[0].image_url;
            const { error: updateError } = await supabase
                .from('posts')
                .update({ image_url: primaryImageUrl })
                .eq('id', postId);
            
            if (updateError) {
                console.error('Error updating post with primary image:', updateError);
            } else {
                console.log(`Updated post ${postId} with primary image URL`);
            }
        }
        
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error storing image metadata:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = {
  router
};