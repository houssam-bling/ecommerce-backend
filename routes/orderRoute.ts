import express from 'express';
import {
    createOrder,
    deleteOrder,
    getAllOrders,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
} from '../controller/orderController.ts';
import { authorize, isOwnerOrAdminOrder, protect } from '../middleware/auth.ts';
import { validateCreateOrder, validateOrderStatus } from '../middleware/validation.ts';

const Route = express.Router();

Route.post('/', protect, validateCreateOrder, createOrder);
Route.get('/', protect, getMyOrders);
Route.get('/admin', protect, authorize('admin'), getAllOrders);
Route.patch('/:id/status', protect, authorize('admin'), validateOrderStatus, updateOrderStatus);
Route.delete('/:id', protect, authorize('admin'), deleteOrder);
Route.get('/:id', protect, isOwnerOrAdminOrder, getOrderById);

export default Route;
