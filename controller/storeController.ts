import { type NextFunction, type Request, type Response } from 'express';
import { storeModel } from '../model/store.ts';

export const getStore = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const store = await storeModel.findOne({ key: 'main' });
        if (!store) {
            return res.status(404).json({ message: 'Store profile not found' });
        }
        res.json(store);
    } catch (error) {
        next(error);
    }
};

export const updateStore = async (req: Request, res: Response, next: NextFunction) => {
    const allowedFields = ['name', 'description', 'logoUrl', 'email', 'phone', 'address'] as const;
    const updates = Object.fromEntries(
        allowedFields
            .filter((field) => req.body[field] !== undefined)
            .map((field) => [field, req.body[field]]),
    );

    try {
        const currentStore = await storeModel.findOne({ key: 'main' });
        if (!currentStore && (!updates.name || !updates.description)) {
            return res.status(400).json({ message: 'Store name and description are required' });
        }
        const store = await storeModel.findOneAndUpdate(
            { key: 'main' },
            { $set: updates },
            { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
        );
        res.json({ message: 'Store profile updated', store });
    } catch (error) {
        next(error);
    }
};
