import express from 'express';
import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getNewProducts,
    getPopularProducts,
    getProductsByCategory,
    getProductById,
    updateProduct,
} from '../controller/productsController.ts';
import { authorize, protect } from '../middleware/auth.ts';
import { productWriteRateLimit } from '../middleware/rateLimits.ts';
import { validateCreateProduct, validateUpdateProduct } from '../middleware/validation.ts';
const Route = express.Router();

Route.post('/', productWriteRateLimit, protect, authorize('admin'), validateCreateProduct, createProduct);
Route.get('/', getAllProducts);
Route.get('/popular', getPopularProducts);
Route.get('/new', getNewProducts);
Route.get('/category/:category', getProductsByCategory);
Route.get('/:id', getProductById);
Route.put('/:id', productWriteRateLimit, protect, authorize('admin'), validateUpdateProduct, updateProduct);
Route.delete('/:id', productWriteRateLimit, protect, authorize('admin'), deleteProduct);

export default Route;