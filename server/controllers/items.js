const { getSupabaseServiceClient } = require('../utils/supabase');
const sharp = require('sharp');
const path = require('path');

const createItem = async (req, res) => {
    try {
        console.log('Attempting to create new item with images...');

        // Extract item data and images from request body
        const { title, description, price, category, images, battery_health, market_value } = req.body;

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
                error: 'Authentication required to create items'
            });
        }

        const supabase = getSupabaseServiceClient();

        // Check if user is admin for auto-approval
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        const isAdmin = profile?.role === 'admin';
        const itemStatus = isAdmin ? 'active' : 'pending';

        console.log(`Creating item for ${isAdmin ? 'admin' : 'user'} - status: ${itemStatus}`);

        // 1. Create the item in the database (without image_url initially)
        const { data: newItem, error: itemError } = await supabase
            .from('items')
            .insert({
                title,
                description: description || null,
                price: parseFloat(price),
                category,
                user_id: userId,
                status: itemStatus,
                battery_health: battery_health ? parseInt(battery_health) : null,
                market_value: market_value ? parseFloat(market_value) : null,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (itemError) {
            console.error('Error creating item in database:', itemError);
            return res.status(500).json({
                error: 'Failed to create item in database',
                message: itemError.message
            });
        }

        console.log('Created item in database with ID:', newItem.id);

        // 2. Handle image uploads if images are provided
        let uploadedImages = [];
        if (images && Array.isArray(images) && images.length > 0) {
            console.log(`Processing ${images.length} images for item ID: ${newItem.id}`);

            for (const fileData of images) {
                try {
                    console.log(`Processing file: ${fileData.originalname}, size: ${fileData.size}`);
                    
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const ext = path.extname(fileData.originalname);
                    const filename = `item-${newItem.id}-${uniqueSuffix}${ext}`;
                    const storagePath = `${newItem.id}/${filename}`;

                    // Log base64 data size
                    const base64Data = fileData.base64.replace(/^data:image\/\w+;base64,/, '');
                    console.log(`Base64 data length: ${base64Data.length} characters`);
                    
                    const buffer = Buffer.from(base64Data, 'base64');
                    console.log(`Buffer size: ${buffer.length} bytes`);

                    // Check buffer size before processing
                    if (buffer.length > 25 * 1024 * 1024) { // 25MB check
                        throw new Error(`Image buffer too large: ${buffer.length} bytes`);
                    }

                    console.log('Starting Sharp compression...');
                    const compressedBuffer = await sharp(buffer)
                        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 80 })
                        .toBuffer();
                    
                    console.log(`Compressed buffer size: ${compressedBuffer.length} bytes`);

                    console.log('Starting Supabase upload...');
                    const { error: uploadError } = await supabase.storage
                        .from('item-images')
                        .upload(storagePath, compressedBuffer, {
                            contentType: fileData.mimetype || 'image/jpeg',
                            upsert: false
                        });

                    if (uploadError) {
                        console.error('Supabase upload error:', uploadError);
                        throw uploadError;
                    }

                    console.log('Supabase upload successful, generating public URL...');
                    const { data: publicUrlData } = supabase.storage
                        .from('item-images')
                        .getPublicUrl(storagePath);
                    
                    const imageUrl = publicUrlData.publicUrl;
                    console.log(`Generated public URL: ${imageUrl}`);

                    console.log('Storing image metadata in database...');
                    const { data: imageRecord, error: dbError } = await supabase
                        .from('item_images')
                        .insert({
                            item_id: newItem.id,
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
                        console.error('Database insert error:', dbError);
                        throw dbError;
                    }

                    uploadedImages.push({
                        id: imageRecord.id,
                        url: imageUrl,
                        filename: filename,
                        original_filename: fileData.originalname,
                        storage_path: storagePath
                    });

                    console.log(`Successfully processed image: ${fileData.originalname}`);

                } catch (fileError) {
                    console.error('Error processing file:', fileData.originalname, fileError);
                }
            }

            // 3. Update the item with the primary image URL if images were uploaded
            if (uploadedImages.length > 0) {
                const primaryImageUrl = uploadedImages[0].url;
                const { error: updateError } = await supabase
                    .from('items')
                    .update({ image_url: primaryImageUrl })
                    .eq('id', newItem.id);

                if (updateError) {
                    console.error('Error updating item with primary image:', updateError);
                } else {
                    newItem.image_url = primaryImageUrl;
                }
            }
        }

        // 4. Fetch user profile and construct the final response
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

        const createdItem = {
            id: newItem.id,
            title: newItem.title,
            description: newItem.description,
            price: newItem.price,
            category: newItem.category,
            status: newItem.status,
            battery_health: newItem.battery_health,
            market_value: newItem.market_value,
            image_url: newItem.image_url,
            images: uploadedImages,
            user: {
                id: userId,
                name: userProfile?.full_name || 'Unknown User',
                email: req.user.email
            },
            created_at: newItem.created_at
        };

        console.log('Successfully created item with images:', createdItem);
        res.status(201).json(createdItem);

    } catch (err) {
        console.error('Server error details:', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            status: err.status,
            body: req.body ? {
                hasImages: !!req.body.images,
                imageCount: req.body.images ? req.body.images.length : 0,
                totalSize: req.body.images ? req.body.images.reduce((sum, img) => sum + (img.size || 0), 0) : 0
            } : 'No body'
        });
        res.status(500).json({ 
            error: 'Internal server error',
            details: err.message 
        });
    }
};

const getItems = async (req, res) => {
    try {
        console.log('Attempting to fetch items from Supabase...');
        
        const supabase = getSupabaseServiceClient();
        
        // Parse query parameters for filtering
        const { status, category, user_id, limit = 50, offset = 0 } = req.query;
        
        let query = supabase
            .from('items')
            .select(`
                *,
                user:profiles (
                    id,
                    full_name,
                    avatar_url
                ),
                images:item_images (
                    id,
                    storage_path,
                    image_url,
                    filename,
                    original_filename
                )
            `)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit))
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
        
        // Apply filters if provided
if (status) {
            query = query.eq('status', status);
        } else {
            // By default, show both active and pending items for public view
            query = query.in('status', ['active', 'pending']);
        }
        
        if (category) {
            query = query.eq('category', category);
        }
        
        if (user_id) {
            query = query.eq('user_id', user_id);
        }
        
        const { data: items, error: itemsError } = await query;
        
        // Make sure all image URLs are properly formatted using Supabase's URL generation
        if (items) {
            console.log('Starting image URL generation for items...');
            
            items.forEach((item, itemIndex) => {
                console.log(`Processing item ${itemIndex + 1}:`, {
                    itemId: item.id,
                    hasMainImage: !!item.image_url,
                    hasImagesArray: !!item.images && item.images.length > 0
                });
                
                // Process images array
                if (item.images && item.images.length > 0) {
                    console.log(`Processing ${item.images.length} images for item ${item.id}`);
                    
                    item.images = item.images.map((image, imageIndex) => {
                        console.log(`Processing image ${imageIndex + 1}:`, {
                            imageId: image.id,
                            storagePath: image.storage_path,
                            existingUrl: image.image_url
                        });
                        
                        // Use Supabase's built-in URL generation for consistency
                        const { data: publicUrlData } = supabase.storage
                            .from('item-images')
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
                
                // Process main item image_url
                if (item.image_url) {
                    console.log(`Processing main image for item ${item.id}:`, {
                        existingUrl: item.image_url,
                        isFullUrl: item.image_url.startsWith('http')
                    });
                    
                    // Only generate new URL if it's not already a full URL
                    if (!item.image_url.startsWith('http')) {
                        const { data: mainPublicUrlData } = supabase.storage
                            .from('item-images')
                            .getPublicUrl(item.image_url);
                        
                        const mainPublicUrl = mainPublicUrlData?.publicUrl;
                        
                        console.log(`Generated main public URL for item ${item.id}:`, mainPublicUrl);
                        
                        item.image_url = mainPublicUrl;
                    } else {
                        console.log(`Main image URL already complete for item ${item.id}`);
                    }
                }
            });
            
            console.log('Image URL generation completed for all items');
        }
            
        if (itemsError) {
            console.error('Supabase error fetching items:', itemsError);
            return res.status(400).json({ error: itemsError.message });
        }
        
        // Transform the data to match the expected format and ensure images are included
        const transformedItems = items.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            price: item.price,
            category: item.category,
            status: item.status || 'pending',
            image_url: item.image_url,
            images: item.images || [], // Include the images array with proper URLs
            user: {
                id: item.user?.id,
                name: item.user?.full_name || 'Unknown User',
                email: null // Email is not available in profiles table
            },
            created_at: item.created_at
        }));
        
        console.log('Successfully fetched items:', transformedItems);
        res.json(transformedItems);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateItemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        console.log(`Updating item ${id} with status: ${status}`);
        
        const supabase = getSupabaseServiceClient();
        
        const { data, error } = await supabase
            .from('items')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }
        
        console.log('Successfully updated item:', data);
        res.json({ success: true, data });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`Deleting item ${id}`);
        
        const supabase = getSupabaseServiceClient();
        
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', id);
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }
        
        console.log('Successfully deleted item');
        res.json({ success: true });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, category, image_url, battery_health, market_value } = req.body;
        
        console.log(`Updating item ${id} with data:`, { title, description, price, category, image_url, battery_health, market_value });
        
        const supabase = getSupabaseServiceClient();
        
        // Build update data object
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (category !== undefined) updateData.category = category;
        if (image_url !== undefined) updateData.image_url = image_url;
        if (battery_health !== undefined) updateData.battery_health = battery_health ? parseInt(battery_health) : null;
        if (market_value !== undefined) updateData.market_value = market_value ? parseFloat(market_value) : null;
        updateData.updated_at = new Date().toISOString();
        
        const { data, error } = await supabase
            .from('items')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }
        
        console.log('Successfully updated item:', data);
        res.json({ success: true, data });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getItemById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Attempting to fetch item ${id} from Supabase...`);
        
        const supabase = getSupabaseServiceClient();
        
        // Fetch specific item with user profile and images
        const { data: item, error: itemError } = await supabase
            .from('items')
            .select(`
                *,
                user:profiles (
                    id,
                    full_name,
                    avatar_url
                ),
                images:item_images (
                    id,
                    storage_path,
                    image_url,
                    filename,
                    original_filename
                )
            `)
            .eq('id', id)
            .single();
            
        if (itemError) {
            console.error('Supabase error fetching item:', itemError);
            if (itemError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Item not found' });
            }
            return res.status(400).json({ error: itemError.message });
        }
        
        // Process images array to ensure proper URLs
        if (item.images && item.images.length > 0) {
            item.images = item.images.map((image) => {
                const { data: publicUrlData } = supabase.storage
                    .from('item-images')
                    .getPublicUrl(image.storage_path);
                
                const publicUrl = publicUrlData?.publicUrl;
                
                return {
                    ...image,
                    image_url: publicUrl,
                    publicUrl: publicUrl
                };
            });
        }
        
        // Transform the data to match the expected format
        const transformedItem = {
            id: item.id,
            title: item.title,
            description: item.description,
            price: item.price,
            category: item.category,
            status: item.status || 'pending',
            image_url: item.image_url,
            images: item.images || [],
            user: {
                id: item.user?.id,
                name: item.user?.full_name || 'Unknown User',
                email: null // Email is not available in profiles table
            },
            created_at: item.created_at
        };
        
        console.log('Successfully fetched item:', transformedItem);
        res.json(transformedItem);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { 
    getItems, 
    createItem, 
    updateItemStatus, 
    deleteItem, 
    updateItem, 
    getItemById 
};
