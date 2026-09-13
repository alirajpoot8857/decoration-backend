"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSingleImage = void 0;
const uploadSingleImage = (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({
            success: true,
            message: 'File uploaded successfully',
            url: fileUrl,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'File upload failed' });
    }
};
exports.uploadSingleImage = uploadSingleImage;
