import { type NextFunction, type Request, type Response } from 'express';
import { z, type ZodType } from 'zod';

const addressSchema = z.object({
    street: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    zipCode: z.string().trim().min(1),
    country: z.string().trim().min(1),
});

const productFields = {
    productName: z.string().trim().min(1),
    productDescription: z.string().trim().min(1),
    productCategory: z.array(z.string().trim().min(1)).min(1),
    productMainImage: z.string().url(),
    productSideImages: z.array(z.string().url()).optional(),
    productPrice: z.number().min(0),
    productInStock: z.boolean().optional(),
    productIsOffer: z.boolean().optional(),
    productCount: z.number().int().min(0),
    productOfferPrice: z.number().min(0).optional(),
};

const validate = (schema: ZodType) =>
    (req: Request, _res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            next(error);
        }
    };

const nonEmpty = (value: object) => Object.keys(value).length > 0;

const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});

const registerSchema = z.object({
    fullname: z.string().trim().min(1),
    dateOfBirth: z.coerce.date(),
    email: z.string().trim().email(),
    password: z.string().min(8),
    gender: z.enum(['male', 'female']).optional(),
});

const createProductSchema = z.object(productFields).refine(
    (product) => product.productIsOffer
        ? product.productOfferPrice !== undefined && product.productOfferPrice < product.productPrice
        : product.productOfferPrice === undefined,
    'Offer price must be set and less than product price',
);

const updateProductSchema = z.object(productFields).partial().refine(nonEmpty);

const storeSchema = z.object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    logoUrl: z.string().url(),
    email: z.string().trim().email(),
    phone: z.string().trim().min(1),
    address: addressSchema,
}).partial().refine(nonEmpty);

const profileSchema = z.object({
    fullname: z.string().trim().min(1),
    dateOfBirth: z.coerce.date(),
    gender: z.enum(['male', 'female']),
    address: addressSchema,
});

const updateMyProfileSchema = profileSchema.partial().refine(nonEmpty);

const updateUserSchema = z.object({
    fullname: z.string().trim().min(1),
    email: z.string().trim().email(),
    dateOfBirth: z.coerce.date(),
    gender: z.enum(['male', 'female']),
    address: addressSchema,
    role: z.enum(['user', 'admin']),
    isActive: z.boolean(),
}).partial().refine(nonEmpty);

const createOrderSchema = z.object({
    products: z.array(z.object({
        productId: z.string().regex(/^[a-f\d]{24}$/i),
        quantity: z.number().int().min(1),
    })).min(1),
    shippingAddress: addressSchema,
});

const updateOrderStatusSchema = z.object({
    status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']),
});

export const validateLogin = validate(loginSchema);
export const validateRegister = validate(registerSchema);
export const validateCreateProduct = validate(createProductSchema);
export const validateUpdateProduct = validate(updateProductSchema);
export const validateStore = validate(storeSchema);
export const validateMyProfile = validate(updateMyProfileSchema);
export const validateUserUpdate = validate(updateUserSchema);
export const validateCreateOrder = validate(createOrderSchema);
export const validateOrderStatus = validate(updateOrderStatusSchema);
