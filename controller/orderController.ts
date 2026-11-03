import mongoose from 'mongoose';
import { type NextFunction, type Request, type Response } from 'express';
import { orderModel, type IOrderItem, type orderInterface } from '../model/order.ts';
import { productModel } from '../model/product.ts';
import type { IUser } from '../model/user.ts';

export interface Req extends Request
{
    user:IUser;
}
const getUserId = (req: Req) => req.user._id;

export const createOrder = async (req: Req, res: Response, next: NextFunction) => {
    const { products : productsBody , shippingAddress } = req.body;

    const products = (productsBody as IOrderItem[]);
    const session = await mongoose.startSession();
    try {
        const userId = req.user._id;

        

        const createdOrder = await session.withTransaction(async ()=>{
            let totalPrice = 0; 
            const quantities = new Map<string,number>();
            for(const item of products)
            {
                const id = item.productId.toString();
                quantities.set(id, (quantities.get(id) ?? 0) + item.quantity);
            }
            const productIds = [...quantities.keys()];

            const dbProducts = await productModel.find({_id:{$in:productIds}}).lean().select('productPrice productOfferPrice productIsOffer').session(session)

            if (dbProducts.length !== productIds.length) 
            {
                throw new Error('One or more products do not exist');
            }

            const orderItems = dbProducts.map((item)=>{

                const quantity = quantities.get(item._id.toString());
                const price = item.productIsOffer && item.productOfferPrice 
                    ? item.productOfferPrice 
                    : item.productPrice;
                    
                totalPrice += price * (quantity as number);
                
                return { productId: item._id, quantity: quantity, price };
            })
            const bulkOps = [];
            for (const [productId, quantity] of quantities) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: productId, productCount: { $gte: quantity } },
                        update: { $inc: { productCount: -quantity, productSales: quantity } }
                    }
                });
            }              
            const result = await productModel.bulkWrite(bulkOps,{session})

            if(result.modifiedCount !== productIds.length)
            {
                throw new Error('Stock insufficient for some items')
            }
            const order = await orderModel.create([{
                userId:userId,
                products:orderItems,
                shippingAddress:shippingAddress,
                totalPrice:totalPrice,

            }],{session})
            return order[0];
        })
        res.status(201).json({ message: 'Order created',order:createdOrder});

    } catch (error : any) {
        if (error.message.includes('Stock insufficient') || error.message.includes('do not exist')) {
            return res.status(400).json({ message: error.message });
        }
        next(error); 
    }
    finally {
        await session.endSession();
    }
};

export const getMyOrders = async (req: Req, res: Response, next: NextFunction) => {
    try {
        const orders = await orderModel.find({ userId: getUserId(req) }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        next(error);
    }
};

export const getAllOrders = async (_req: Req, res: Response, next: NextFunction) => {
    try {
        const orders = await orderModel.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        next(error);
    }
};

export const getOrderById = async (req: Req, res: Response, next: NextFunction) => {
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

export const updateOrderStatus = async (req: Req, res: Response, next: NextFunction) => {
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

export const deleteOrder = async (req: Req, res: Response, next: NextFunction) => {
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