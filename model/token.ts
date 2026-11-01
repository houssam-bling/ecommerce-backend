import mongoose from 'mongoose';

export interface Token extends mongoose.Document {
    refreshToken: string;
    userId: mongoose.Types.ObjectId;
}

const Schema = mongoose.Schema;

const tokenSchema = new Schema<Token>({
    refreshToken: { 
        required: true, 
        type: String, 
        unique: true 
    },
    userId: { 
        type: mongoose.Types.ObjectId, 
        ref: 'User', 
        required: true
    },
}, { timestamps: true });

tokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const tokenModel = mongoose.model<Token>('Token', tokenSchema);