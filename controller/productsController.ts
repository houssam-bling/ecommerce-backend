import { type NextFunction, type Request, type Response } from "express"
import { productModel } from "../model/product.ts";

export const createProduct = async (req:Request,res:Response,next:NextFunction)=>
{
    try
    {
        const product = await productModel.create(req.body);
        res.status(201).json({ message: "Product created", product });
    }
    catch (error)
    {
        next(error);
    }
}

export const updateProduct = async (req:Request,res:Response,next:NextFunction)=>
{
    try
    {
        const product = await productModel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { returnDocument: 'after', runValidators: true },
        );
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json({ message: "Product updated", product });
    }
    catch (error)
    {
        next(error);
    }
}

export const deleteProduct = async (req:Request,res:Response,next:NextFunction)=>
{
    try
    {
        const product = await productModel.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json({ message: "Product deleted", product });
    }
    catch (error)
    {
        next(error);
    }
}

export const getAllProducts = async (req:Request,res:Response,next:NextFunction)=>
{

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const skip = (page - 1) * limit;
    try
    {
        const products = await productModel.find().skip(skip).limit(limit).sort({ createdAt: -1 });
        res.json(products);
    }
    catch (error)
    {
        next(error);
    }
}
export const getProductById = async (req:Request,res:Response,next:NextFunction)=>
{
    try
    {
        const product = await productModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json({message:"Product found",product:product});
    }
    catch (error)
    {
        next(error);
    }
}

export const getPopularProducts = async (req:Request,res:Response,next:NextFunction)=>
{
    const limit = parseInt(req.query.limit as string) || 10;

    try
    {
        const products = await productModel.find()
            .select("+productSales")
            .sort({ productSales: -1 })
            .limit(limit);
        res.json(products);
    }
    catch (error)
    {
        next(error);
    }
}

export const getNewProducts = async (req:Request,res:Response,next:NextFunction)=>
{
    const limit = parseInt(req.query.limit as string) || 10;

    try
    {
        const products = await productModel.find()
            .sort({ createdAt: -1 })
            .limit(limit);
        res.json(products);
    }
    catch (error)
    {
        next(error);
    }
}

export const getProductsByCategory = async (req:Request,res:Response,next:NextFunction)=>
{
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    try
    {
        const products = await productModel.find({ productCategory: req.params.category })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        res.json(products);
    }
    catch (error)
    {
        next(error);
    }
}