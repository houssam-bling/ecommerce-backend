import mongoose from 'mongoose';
import { type IAddress } from './user.ts';

interface IStore extends mongoose.Document {
    key: string;
    name: string;
    description: string;
    logoUrl?: string;
    email?: string;
    phone?: string;
    address?: IAddress;
}

const addressSchema = new mongoose.Schema<IAddress>({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
}, { _id: false });

const storeSchema = new mongoose.Schema<IStore>({
    key: { type: String, default: 'main', unique: true, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    logoUrl: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: addressSchema },
}, { timestamps: true });

export const storeModel = mongoose.model<IStore>('Store', storeSchema);
