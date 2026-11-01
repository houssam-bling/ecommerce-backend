import { type Request, type Response, type NextFunction } from 'express';
export const GlobalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {

    if (err.name === 'CastError') {
        return res.status(400).json({ message: 'المعرف (ID) غير صالح' });
    }

    if (err.name === 'ValidationError') {

        return res.status(400).json({ message: "البيانات ناقصة"});
    }

    if (err.code === 11000) {
        return res.status(409).json({ message: 'هذه البيانات موجودة مسبقاً' });
    }

    if (err.name === 'ZodError') {
        return res.status(400).json({ message: err.errors[0].message });
    }

    res.status(500).json({ 
        message: err.message || 'حدث خطأ في السيرفر، يرجى المحاولة لاحقاً' 
    });
}