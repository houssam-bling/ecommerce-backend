import mongoose from 'mongoose';
import { type NextFunction, type Request, type Response } from 'express';
import { orderModel } from '../model/order.ts';
import { productModel } from '../model/product.ts';

type AuthenticatedRequest = Request & {
    user?: { _id: mongoose.Types.ObjectId };
};

const getUserId = (req: Request) => (req as AuthenticatedRequest).user?._id;

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    const { products, shippingAddress } = req.body;
    const addressFields = ['street', 'city', 'state', 'zipCode', 'country'];
    const hasValidAddress = shippingAddress && addressFields.every(
        (field) => typeof shippingAddress[field] === 'string' && shippingAddress[field].trim(),
    );
    if (!Array.isArray(products) || products.length === 0 || !hasValidAddress) {
        return res.status(400).json({ message: 'Products and shippingAddress are required' });
    }

    try {
        const quantities: Record<string, number> = {};
        for (const item of products) {
            if (
                !item ||
                !mongoose.isValidObjectId(item.productId) ||
                !Number.isInteger(item.quantity) ||
                item.quantity < 1
            ) {
                return res.status(400).json({
                    message: 'Each product requires a valid productId and positive integer quantity',
                });
            }
            const productId = item.productId.toString();
            quantities[productId] = (quantities[productId] ?? 0) + item.quantity;
        }

        const productIds = Object.keys(quantities);
        const foundProducts = await productModel.find({ _id: { $in: productIds } });
        if (foundProducts.length !== productIds.length) {
            return res.status(400).json({ message: 'One or more products do not exist' });
        }

        const orderProducts = [];
        let totalPrice = 0;
        for (const product of foundProducts) {
            const quantity = quantities[product._id.toString()];
            if (!product.productInStock || product.productCount < quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.productName}`,
                });
            }
            const price = product.productIsOffer && product.productOfferPrice
                ? product.productOfferPrice
                : product.productPrice;
            orderProducts.push({ productId: product._id, quantity, price });
            totalPrice += price * quantity;
        }

        const order = await orderModel.create({
            userId: getUserId(req),
            products: orderProducts,
            shippingAddress,
            totalPrice,
        });
        res.status(201).json({ message: 'Order created', order });
    } catch (error) {
        next(error);
    }
};

export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orders = await orderModel.find({ userId: getUserId(req) }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        next(error);
    }
};

export const getAllOrders = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const orders = await orderModel.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        next(error);
    }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const order = await orderModel.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        next(error);
    }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid order status' });
    }

    try {
        const order = await orderModel.findByIdAndUpdate(
            req.params.id,
            { $set: { status: req.body.status } },
            { returnDocument: 'after', runValidators: true },
        );
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ message: 'Order status updated', order });
    } catch (error) {
        next(error);
    }
};

export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const order = await orderModel.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ message: 'Order deleted' });
    } catch (error) {
        next(error);
    }
};