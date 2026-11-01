import mongoose from 'mongoose';
import { type IAddress } from './user.ts';

const schema = mongoose.Schema;


interface IOrderItem {
    productId: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
}

interface orderInterface extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    products: IOrderItem[];
    shippingAddress: IAddress;
    totalPrice: number;
    status: "pending" | "shipped" | "delivered" | "cancelled";
}

const orderSchema = new schema<orderInterface>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: true },
        quantity: { type: Number, required: true, min: [1, "Quantity must be at least 1"] },
        price: { type: Number, required: true, min: [0, "Price cannot be negative"] }
    }],
    shippingAddress: { type: Object, required: true }, // تقدر تستعمل addressSchema هنا إلا تصدرتيها من user.ts
    totalPrice: { type: Number, required: true, min: [0, "totalPrice must be greater than or equal to 0"] },
    status: { type: String, enum: ["pending", "shipped", "delivered", "cancelled"], default: "pending" },
}, { timestamps: true });

export const orderModel = mongoose.model<orderInterface>('order', orderSchema);