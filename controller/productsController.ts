import express,{ type Express, type Request, type Response }  from "express"
import { productModel } from "../model/product.ts";


export const getAllProducts = async (req:Request,res:Response)=>
{

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    try
    {
        const products = await productModel.find().skip(skip).limit(limit);
        res.json(products);
    }
    catch (error)
    {
        res.status(500).json({ message: "Error fetching products", error });
    }
}