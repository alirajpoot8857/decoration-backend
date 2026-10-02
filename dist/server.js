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
// ======================================================
// CORS CONFIGURATION
// ======================================================
const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean)
    : [];
const defaultOrigins = [
    'https://decordesigns.online',
    'https://www.decordesigns.online',
    'http://decordesigns.online',
    'http://www.decordesigns.online',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));
const isAllowedOrigin = (origin) => {
    if (!origin)
        return true;
    if (allowedOrigins.includes(origin))
        return true;
    if (/^https?:\/\/([a-zA-Z0-9-]+\.)*decordesigns\.online(:\d+)?$/.test(origin))
        return true;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
        return true;
    if (/^https:\/\/[a-zA-Z0-9-]+.*\.vercel\.app$/.test(origin))
        return true;
    return false;
};
const corsOptions = {
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Request blocked from unauthorized origin: ${origin}`);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'Range',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 204,
    maxAge: 86400,
};
// Apply CORS before other middleware
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
// ======================================================
// SECURITY
// ======================================================
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: {
        policy: 'cross-origin',
    },
}));
// ======================================================
// BODY PARSER
// ======================================================
app.use(express_1.default.json({
    limit: '20mb',
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '20mb',
}));
// ======================================================
// LOGGER
// ======================================================
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('dev'));
}
// ======================================================
// STATIC UPLOADS
// ======================================================
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
app.use('/uploads', express_1.default.static(uploadsDir));
// ======================================================
// HEALTH CHECK
// ======================================================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'LUMIÈRE DECOR API',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});
// ======================================================
// API ROUTES
// ======================================================
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
// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================
app.use(errorHandler_js_1.errorHandler);
// ======================================================
// START SERVER
// ======================================================
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log('==========================================');
        console.log('✨ LUMIÈRE DECOR API');
        console.log('==========================================');
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 API: http://localhost:${PORT}/api`);
        console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
        console.log('==========================================');
        console.log('Allowed CORS Origins:');
        console.log(allowedOrigins);
        console.log('==========================================');
    });
}
exports.default = app;
