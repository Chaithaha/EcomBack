const { getSupabaseServiceClient } = require('../utils/supabase');
const sharp = require('sharp');
const path = require('path');

const createPost = async (req, res) => {
    try {
        console.log('Attempting to create new post with images...');

        // Extract post data and images from request body
        const { title, description, price, category, images } = req.body;

        // Validate required fields
        if (!title || !price || !category) {
            return res.status(400).json({
                error: 'Missing required fields: title, price, and category are required'
            });
        }

        if (isNaN(price) || parseFloat(price) <= 0) {
            return res.status(400).json({
                error: 'Price must be a valid positive number'
            });
        }

        // Get authenticated user ID from the request
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                error: 'Authentication required to create posts'
            });
        }

        const supabase = getSupabaseServiceClient();

        // 1. Create the post in the database (without image_url initially)
        const { data: newPost, error: postError } = await supabase
            .from('posts')
            .insert({
                title,
                description: description || null,
                price: parseFloat(price),
                category,
                user_id: userId,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (postError) {
            console.error('Error creating post in database:', postError);
            return res.status(500).json({
                error: 'Failed to create post in database',
                message: postError.message
            });
        }

        console.log('Created post in database with ID:', newPost.id);

        // 2. Handle image uploads if images are provided
        let uploadedImages = [];
        if (images && Array.isArray(images) && images.length > 0) {
            console.log(`Processing ${images.length} images for post ID: ${newPost.id}`);

            for (const fileData of images) {
                try {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const ext = path.extname(fileData.originalname);
                    const filename = `post-${newPost.id}-${uniqueSuffix}${ext}`;
                    const storagePath = `${newPost.id}/${filename}`;

                    const base64Data = fileData.base64.replace(/^data:image\/\w+;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');

                    const compressedBuffer = await sharp(buffer)
                        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 80 })
                        .toBuffer();

                    const { error: uploadError } = await supabase.storage
                        .from('post-images')
                        .upload(storagePath, compressedBuffer, {
                            contentType: fileData.mimetype || 'image/jpeg',
                            upsert: false
                        });

                    if (uploadError) {
                        throw uploadError;
                    }

                    const { data: publicUrlData } = supabase.storage
                        .from('post-images')
                        .getPublicUrl(storagePath);
                    
                    const imageUrl = publicUrlData.publicUrl;

                    const { data: imageRecord, error: dbError } = await supabase
                        .from('post_images')
                        .insert({
                            post_id: newPost.id,
                            storage_path: storagePath,
                            filename: filename,
                            original_filename: fileData.originalname,
                            file_size: compressedBuffer.length,
                            mime_type: fileData.mimetype || 'image/jpeg',
                            image_url: imageUrl
                        })
                        .select()
                        .single();

                    if (dbError) {
                        throw dbError;
                    }

                    uploadedImages.push({
                        id: imageRecord.id,
                        url: imageUrl,
                        filename: filename,
                        original_filename: fileData.originalname,
                        storage_path: storagePath
                    });

                } catch (fileError) {
                    console.error('Error processing file:', fileData.originalname, fileError);
                }
            }

            // 3. Update the post with the primary image URL if images were uploaded
            if (uploadedImages.length > 0) {
                const primaryImageUrl = uploadedImages[0].url;
                const { error: updateError } = await supabase
                    .from('posts')
                    .update({ image_url: primaryImageUrl })
                    .eq('id', newPost.id);

                if (updateError) {
                    console.error('Error updating post with primary image:', updateError);
                } else {
                    newPost.image_url = primaryImageUrl;
                }
            }
        }

        // 4. Fetch user profile and construct the final response
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

        const createdPost = {
            id: newPost.id,
            title: newPost.title,
            description: newPost.description,
            price: newPost.price,
            category: newPost.category,
            status: newPost.status,
            image_url: newPost.image_url,
            images: uploadedImages,
            user: {
                id: userId,
                name: profile?.full_name || 'Unknown User',
                email: req.user.email
            },
            created_at: newPost.created_at
        };

        console.log('Successfully created post with images:', createdPost);
        res.status(201).json(createdPost);

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getPosts = async (req, res) => {
    try {
        console.log('Attempting to fetch posts from Supabase...');
        
        const supabase = getSupabaseServiceClient();
        
        // Fetch posts with user profiles and images in a single query
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select(`
                *,
                user:profiles (
                    id,
                    full_name,
                    avatar_url
                ),
                images:post_images (
                    id,
                    storage_path,
                    image_url,
                    filename,
                    original_filename
                )
            `)
            .order('created_at', { ascending: false });
            
        // Make sure all image URLs are properly formatted using Supabase's URL generation
        if (posts) {
            console.log('Starting image URL generation for posts...');
            
            posts.forEach((post, postIndex) => {
                console.log(`Processing post ${postIndex + 1}:`, {
                    postId: post.id,
                    hasMainImage: !!post.image_url,
                    hasImagesArray: !!post.images && post.images.length > 0
                });
                
                // Process images array
                if (post.images && post.images.length > 0) {
                    console.log(`Processing ${post.images.length} images for post ${post.id}`);
                    
                    post.images = post.images.map((image, imageIndex) => {
                        console.log(`Processing image ${imageIndex + 1}:`, {
                            imageId: image.id,
                            storagePath: image.storage_path,
                            existingUrl: image.image_url
                        });
                        
                        // Use Supabase's built-in URL generation for consistency
                        const { data: publicUrlData } = supabase.storage
                            .from('post-images')
                            .getPublicUrl(image.storage_path);
                        
                        const publicUrl = publicUrlData?.publicUrl;
                        
                        console.log(`Generated public URL for image ${image.id}:`, publicUrl);
                        
                        return {
                            ...image,
                            image_url: publicUrl,
                            publicUrl: publicUrl
                        };
                    });
                }
                
                // Process main post image_url
                if (post.image_url) {
                    console.log(`Processing main image for post ${post.id}:`, {
                        existingUrl: post.image_url,
                        isFullUrl: post.image_url.startsWith('http')
                    });
                    
                    // Only generate new URL if it's not already a full URL
                    if (!post.image_url.startsWith('http')) {
                        const { data: mainPublicUrlData } = supabase.storage
                            .from('post-images')
                            .getPublicUrl(post.image_url);
                        
                        const mainPublicUrl = mainPublicUrlData?.publicUrl;
                        
                        console.log(`Generated main public URL for post ${post.id}:`, mainPublicUrl);
                        
                        post.image_url = mainPublicUrl;
                    } else {
                        console.log(`Main image URL already complete for post ${post.id}`);
                    }
                }
            });
            
            console.log('Image URL generation completed for all posts');
        }
            
        if (postsError) {
            console.error('Supabase error fetching posts:', postsError);
            return res.status(400).json({ error: postsError.message });
        }
        
        // Transform the data to match the expected format and ensure images are included
        const transformedPosts = posts.map(post => ({
            id: post.id,
            title: post.title,
            description: post.description,
            price: post.price,
            category: post.category,
            status: post.status || 'pending',
            image_url: post.image_url,
            images: post.images || [], // Include the images array with proper URLs
            user: {
                id: post.user?.id,
                name: post.user?.full_name || 'Unknown User',
                email: null // Email is not available in profiles table
            },
            created_at: post.created_at
        }));
        
        console.log('Successfully fetched posts:', transformedPosts);
        res.json(transformedPosts);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updatePostStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        console.log(`Updating post ${id} with status: ${status}`);
        
        const supabase = getSupabaseServiceClient();
        
        const { data, error } = await supabase
            .from('posts')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }
        
        console.log('Successfully updated post:', data);
        res.json({ success: true, data });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        
        console.log(`Deleting post ${id}`);
        
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const supabase = getSupabaseServiceClient();
        
        // First, check if the post exists and belongs to the user
        const { data: existingPost, error: postError } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', id)
            .single();
            
        if (postError) {
            console.error('Supabase error fetching post:', postError);
            if (postError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Post not found' });
            }
            return res.status(400).json({ error: postError.message });
        }
        
        // Check ownership
        if (existingPost.user_id !== userId) {
            return res.status(403).json({ error: 'You can only delete your own posts' });
        }
        
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', id);
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }
        
        console.log('Successfully deleted post');
        res.json({ success: true });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, category, image_url } = req.body;
        const userId = req.user?.id;
        
        console.log(`Updating post ${id} with data:`, { title, description, price, category, image_url });
        
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const supabase = getSupabaseServiceClient();
        
        // First, check if the post exists and belongs to the user
        const { data: existingPost, error: postError } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', id)
            .single();
            
        if (postError) {
            console.error('Supabase error fetching post:', postError);
            if (postError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Post not found' });
            }
            return res.status(400).json({ error: postError.message });
        }
        
        // Check ownership
        if (existingPost.user_id !== userId) {
            return res.status(403).json({ error: 'You can only edit your own posts' });
        }
        
        // Build update data object
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (category !== undefined) updateData.category = category;
        if (image_url !== undefined) updateData.image_url = image_url;
        updateData.updated_at = new Date().toISOString();
        
        const { data, error } = await supabase
            .from('posts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }
        
        console.log('Successfully updated post:', data);
        res.json({ success: true, data });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Attempting to fetch post ${id} from Supabase...`);
        
        const supabase = getSupabaseServiceClient();
        
        // Fetch specific post with user profile
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select(`
                *,
                user:profiles (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .eq('id', id)
            .single();
            
        if (postError) {
            console.error('Supabase error fetching post:', postError);
            if (postError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Post not found' });
            }
            return res.status(400).json({ error: postError.message });
        }
        
        // Transform the data to match the expected format
        const transformedPost = {
            id: post.id,
            title: post.title,
            description: post.description,
            price: post.price,
            category: post.category,
            status: post.status || 'pending',
            image_url: post.image_url,
            user: {
                id: post.user?.id,
                name: post.user?.full_name || 'Unknown User',
                email: null // Email is not available in profiles table
            },
            created_at: post.created_at
        };
        
        console.log('Successfully fetched post:', transformedPost);
        res.json(transformedPost);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getPosts, createPost, updatePostStatus, deletePost, updatePost, getPostById };