import { type Request, type Response, type NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.ts';
import {userModel} from '../model/user.ts'

export const protect = async (req: Request, res: Response, next: NextFunction)=>
{
        try
    {
        let token;

        if(req.headers.authorization?.startsWith('Bearer'))
        {
            token = req.headers.authorization.split(' ')[1];
        }
        if(!token)
        {
            return res.status(401).json({ 
                    message: 'غير مصرح، الرجاء تسجيل الدخول' 
                })
        }

        const decoded = verifyToken(token);

        const User = await userModel.findById(decoded.id);
        if (!User) {
            return res.status(401).json({ 
                message: 'المستخدم لم يعد موجوداً' 
            });
        }

        (req as any).user = {
                _id: User._id,
                fullname: User.fullname,
                email: User.email,
                role: User.role,
        };

        next()

    }
    catch(err : any)
    {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'token غير صالح' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'token منتهي الصلاحية' });
        }
        res.status(500).json({ message: err.message });
    }
}
export const authorize = (...roles:string[])=>{
    return async (req : Request,res : Response,next : NextFunction)=>{

        if(roles.includes((req as any).user?.role))
        {
            return next();
        }
        return res.status(403).json({message:"لست مصرح"})
    }

}