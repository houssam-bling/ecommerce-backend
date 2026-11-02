import mongoose from 'mongoose';
import { type NextFunction, type Request, type Response } from 'express';
import { tokenModel } from '../model/token.ts';
import { userModel } from '../model/user.ts';

type AuthenticatedRequest = Request & {
    user?: { _id: mongoose.Types.ObjectId; role: string };
};

const getUserId = (req: Request) =>
    (req as AuthenticatedRequest).user?._id;

const publicUserFields = '-password';

export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await userModel.findById(getUserId(req)).select(publicUserFields);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    const allowedFields = ['fullname', 'dateOfBirth', 'gender', 'address'] as const;
    const updates = Object.fromEntries(
        allowedFields
            .filter((field) => req.body[field] !== undefined)
            .map((field) => [field, req.body[field]]),
    );

    try {
        const user = await userModel.findByIdAndUpdate(
            getUserId(req),
            { $set: updates },
            { returnDocument: 'after', runValidators: true },
        ).select(publicUserFields);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'Profile updated', user });
    } catch (error) {
        next(error);
    }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    try {
        const users = await userModel.find()
            .select(publicUserFields)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        next(error);
    }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await userModel.findById(req.params.id).select(publicUserFields);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    const allowedFields = ['fullname', 'email', 'dateOfBirth', 'gender', 'address', 'role', 'isActive'] as const;
    const updates = Object.fromEntries(
        allowedFields
            .filter((field) => req.body[field] !== undefined)
            .map((field) => [field, req.body[field]]),
    );

    try {
        const user = await userModel.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { returnDocument: 'after', runValidators: true },
        ).select(publicUserFields);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User updated', user });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await userModel.findByIdAndDelete(req.params.id).select(publicUserFields);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await tokenModel.deleteMany({ userId: user._id });
        res.json({ message: 'User deleted' });
    } catch (error) {
        next(error);
    }
};
