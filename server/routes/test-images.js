const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Create unique filename with timestamp and original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `test-${uniqueSuffix}${ext}`);
    }
});

// File filter for images only
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

// Create upload middleware with limits
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: fileFilter
});

// Middleware to compress uploaded images
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

// Test endpoint for image upload without authentication
router.post('/test-upload', upload.array('images', 5), compressImage, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        console.log('Test upload successful, files:', req.files.map(f => ({
            originalname: f.originalname,
            filename: f.filename,
            size: f.size,
            path: f.path
        })));

        res.status(200).json({
            success: true,
            message: `${req.files.length} files uploaded successfully for testing`,
            files: req.files.map(f => ({
                originalname: f.originalname,
                filename: f.filename,
                size: f.size,
                path: f.path
            }))
        });

    } catch (error) {
        console.error('Test upload error:', error);
        
        // Clean up uploaded files if there was an error
        if (req.files) {
            req.files.forEach(file => {
                if (file && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        
        res.status(500).json({ 
            error: 'Test upload failed',
            message: error.message 
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        // Multer error
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Maximum is 5 files.' });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Unexpected field name. Use "images" for file uploads.' });
        }
        return res.status(400).json({ error: `Upload error: ${error.message}` });
    } else if (error) {
        // Other errors
        return res.status(400).json({ error: error.message });
    }
    next();
});

module.exports = router;