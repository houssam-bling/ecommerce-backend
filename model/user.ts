import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
export interface IAddress {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}
export interface IUser extends mongoose.Document {
    fullname: string;
    dateOfBirth: Date;
    email: string;
    password: string;
    address: IAddress; 
    gender: 'male' | 'female'
    role: 'user' | 'admin' ;
    isActive: boolean;
}

const schema = mongoose.Schema;

const addressSchema = new schema<IAddress>({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
}, { _id: false });

const userSchema = new schema<IUser>({
    fullname: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true,select: false },
    address: { type: addressSchema }, 
    role: {type: String, enum:['user','admin'], default: "user" },
    gender: {type: String, enum:['male','female'] },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre("save",async function() {
    if(!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password,12)
})
export const userModel = mongoose.model<IUser>('User', userSchema);