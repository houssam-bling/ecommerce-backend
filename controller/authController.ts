import {userModel } from '../model/user.ts';
import {type NextFunction, type Request, type Response } from 'express';
import {generateRefresToken, generateToken, verifyRefreshToken} from '../utils/jwt.ts'
import bcrypt from 'bcryptjs';
import { tokenModel } from '../model/token.ts';
import { hashtoken } from '../utils/helperFunctions.ts';
export const registerUser = async (req: Request, res: Response,next:NextFunction) => 
{
    const { fullname, dateOfBirth, email, password, gender } = req.body;

    try 
    {
        const existingUser = await userModel.findOne({ email });
        if(existingUser)
        {
            return res.status(400).json({ message: "User already exists" });
        }


        const newUser = await userModel.create({
            fullname: fullname,
            dateOfBirth: dateOfBirth,
            email: email,
            password: password,
            gender: gender,
        });
        const token = generateToken({ id : (newUser._id).toString(), role:newUser.role });
        const refreshToken = generateRefresToken({id:(newUser._id).toString()});
        await tokenModel.create({userId:newUser._id,refreshToken:hashtoken(refreshToken)})

        res.cookie('refreshtoken',refreshToken,{
            httpOnly:true,
            sameSite:'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure:true,
        });
        res.status(201).json({ message: "User registered successfully",user:{
                _id: newUser._id,
                fullname: newUser.fullname,
                email: newUser.email,
                gender: newUser.gender,
                role: newUser.role
            },token:token });
    }
    catch (e)
    {
        next(e)
    }
}
export const loginUser = async (req:Request,res:Response,next:NextFunction)=>{

    const {password,email} = req.body;
    try
    {
        const user = await userModel.findOne({email:email}).select('+password');
        if(!user)
        {
            return res.status(404).json({message:"Invalid credentials"});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch)
        {
            return res.status(401).json({message:"Invalid credentials"});
        }
        const token = generateToken({id:(user._id).toString(),role:user.role});
        const refreshToken = generateRefresToken({id:(user._id).toString()});
        await tokenModel.deleteMany({ userId: user._id });
        await tokenModel.create({userId:user._id,refreshToken:hashtoken(refreshToken)})

        res.cookie('refreshtoken',refreshToken,{
            httpOnly:true,
            sameSite:'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure:true,
        });

        res.status(200).json({message:"Login successful", user:{
                _id: user._id,
                fullname: user.fullname,
                email: user.email,
                gender: user.gender,
                role: user.role
            },token:token});
    }
    catch(e : any)
    {
        next(e)
    }
}
export const logoutUser = async (req:Request,res:Response,next:NextFunction)=>{
    const refreshToken = req.cookies.refreshtoken;
    
    try
    {
        if(!req.cookies.refreshtoken)
        {
            return res.status(401).json({message:"login first"});
        }
        verifyRefreshToken(refreshToken);
        const oldHashedRefreshToken = hashtoken(refreshToken);
        await tokenModel.deleteOne({ refreshToken: oldHashedRefreshToken });
        res.clearCookie('refreshtoken');
        res.status(200).json({ message: "Logout successful" });
    }
    catch(e : any)
    {
        if (e.name === 'JsonWebTokenError') {
            res.clearCookie('refreshtoken');
            return res.status(401).json({ message: 'token غير صالح' });
        }
        if (e.name === 'TokenExpiredError') {
            res.clearCookie('refreshtoken');
            return res.status(401).json({ message: 'token منتهي الصلاحية' });
        }
        next(e)    
    }
}
export const refreshToken = async (req:Request,res:Response,next:NextFunction)=>{
    const refreshToken = req.cookies.refreshtoken;
    if(!refreshToken)
    {
        return res.status(401).json({message:"No refresh token provided"});
    }
    try
    {
        const decoded = verifyRefreshToken(refreshToken);
        const tokenDoc = await tokenModel.findOne({ refreshToken: hashtoken(refreshToken) });
        if(!tokenDoc)
        {
            await tokenModel.deleteMany({ userId: decoded.id });
            res.clearCookie('refreshtoken');
            return res.status(401).json({message:"stolen refresh token detected"});
        }
        const user = await userModel.findById(decoded.id);
        if(!user)
        {
            return res.status(404).json({message:"User not found"});
        }
        const newToken = generateToken({id:user._id.toString(),role:user.role});
        
        const newRefreshToken = generateRefresToken({id:user._id.toString()});
        await tokenModel.deleteMany({ userId: decoded.id });
        await tokenModel.create({userId:decoded.id,refreshToken:hashtoken(newRefreshToken)})
        res.cookie('refreshtoken',newRefreshToken,{
            httpOnly:true,
            sameSite:"none",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure:false,
        });
        res.status(200).json({token:newToken});
    }
    catch(e : any)
    {
        if (e.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'invalid token' });
        }
        if (e.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'expired token' });
        }
        next(e)
    }
}
