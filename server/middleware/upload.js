// This file is deprecated and kept for reference only.
// The image upload functionality has been moved to Supabase Storage.
// See server/routes/images.js for the new implementation.

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Note: This middleware is no longer used in production
// It's kept here for reference and potential future use

// Ensure uploads directory exists (for legacy support)
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage (deprecated)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Create unique filename with timestamp and original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `post-${uniqueSuffix}${ext}`);
    }
});

// File filter for images only (deprecated)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

// Create upload middleware with limits (deprecated)
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: fileFilter
});

// Middleware to compress uploaded images (deprecated)
const compressImage = async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next();
    }

    try {
        for (const file of req.files) {
            if (file) {
                const filePath = file.path;
                const ext = path.extname(file.originalname).toLowerCase();
                
                // Compress the image
                const compressedPath = filePath.replace(ext, `-compressed${ext}`);
                
                await sharp(filePath)
                    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }) // Max dimensions
                    .jpeg({ quality: 80 }) // 80% quality for JPEG
                    .png({ quality: 80 }) // 80% quality for PNG
                    .toFile(compressedPath);
                
                // Replace original with compressed version
                fs.unlinkSync(filePath);
                file.path = compressedPath;
                file.filename = path.basename(compressedPath);
            }
        }
        
        next();
    } catch (error) {
        console.error('Error compressing images:', error);
        // Continue without compression if it fails
        next();
    }
};

// Middleware to handle multiple image uploads (deprecated)
const uploadMultiple = upload.array('images', 5); // Up to 5 images

module.exports = {
    upload,
    uploadMultiple,
    compressImage
};

// DEPRECATED WARNING:
// This middleware is deprecated and no longer used in production.
// Image uploads now use Supabase Storage instead of local file storage.
// Please use server/routes/images.js for all new image upload functionality.