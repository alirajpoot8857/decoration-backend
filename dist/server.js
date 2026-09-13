"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import Routes
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const userRoutes_js_1 = __importDefault(require("./routes/userRoutes.js"));
const serviceRoutes_js_1 = __importDefault(require("./routes/serviceRoutes.js"));
const packageRoutes_js_1 = __importDefault(require("./routes/packageRoutes.js"));
const galleryRoutes_js_1 = __importDefault(require("./routes/galleryRoutes.js"));
const rentalRoutes_js_1 = __importDefault(require("./routes/rentalRoutes.js"));
const inventoryRoutes_js_1 = __importDefault(require("./routes/inventoryRoutes.js"));
const saleRoutes_js_1 = __importDefault(require("./routes/saleRoutes.js"));
const purchaseRoutes_js_1 = __importDefault(require("./routes/purchaseRoutes.js"));
const bookingRoutes_js_1 = __importDefault(require("./routes/bookingRoutes.js"));
const eventRoutes_js_1 = __importDefault(require("./routes/eventRoutes.js"));
const customerRoutes_js_1 = __importDefault(require("./routes/customerRoutes.js"));
const testimonialRoutes_js_1 = __importDefault(require("./routes/testimonialRoutes.js"));
const contactRoutes_js_1 = __importDefault(require("./routes/contactRoutes.js"));
const activityLogRoutes_js_1 = __importDefault(require("./routes/activityLogRoutes.js"));
const dashboardRoutes_js_1 = __importDefault(require("./routes/dashboardRoutes.js"));
const settingRoutes_js_1 = __importDefault(require("./routes/settingRoutes.js"));
const uploadRoutes_js_1 = __importDefault(require("./routes/uploadRoutes.js"));
const errorHandler_js_1 = require("./middleware/errorHandler.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
// Security & Utility Middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use((0, cors_1.default)({
    origin: [CORS_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('dev'));
}
// Static Uploads Directory
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
app.use('/uploads', express_1.default.static(uploadsDir));
// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'LUMIÈRE DECOR API',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});
// Mount Resource API Routes
app.use('/api/auth', authRoutes_js_1.default);
app.use('/api/users', userRoutes_js_1.default);
app.use('/api/services', serviceRoutes_js_1.default);
app.use('/api/packages', packageRoutes_js_1.default);
app.use('/api/gallery', galleryRoutes_js_1.default);
app.use('/api/rentals', rentalRoutes_js_1.default);
app.use('/api/inventory', inventoryRoutes_js_1.default);
app.use('/api/sales', saleRoutes_js_1.default);
app.use('/api/purchases', purchaseRoutes_js_1.default);
app.use('/api/bookings', bookingRoutes_js_1.default);
app.use('/api/events', eventRoutes_js_1.default);
app.use('/api/customers', customerRoutes_js_1.default);
app.use('/api/testimonials', testimonialRoutes_js_1.default);
app.use('/api/contact', contactRoutes_js_1.default);
app.use('/api/activity-logs', activityLogRoutes_js_1.default);
app.use('/api/dashboard', dashboardRoutes_js_1.default);
app.use('/api/settings', settingRoutes_js_1.default);
app.use('/api/upload', uploadRoutes_js_1.default);
// Global Error Handler
app.use(errorHandler_js_1.errorHandler);
// Start Server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`✨ LUMIÈRE DECOR API Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
        console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    });
}
exports.default = app;
