import express, { type Express, type Request, type Response } from 'express';
import productsRouter from './routes/productsRoute.ts'
import authRouter from './routes/authRoute.ts'
import storeRouter from './routes/storeRoute.ts';
import userRouter from './routes/userRoute.ts';
import orderRouter from './routes/orderRoute.ts';
import statesRouter from './routes/statesRoute.ts';
import { GlobalErrorHandler } from './middleware/globalErrorHandler.ts';
import cookieParser from 'cookie-parser';
import { globalRateLimit } from './middleware/rateLimits.ts';
import cors from 'cors';

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());

export const app : Express = express();
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(globalRateLimit);
app.use('/products',productsRouter)
app.use('/auth',authRouter)
app.use('/store', storeRouter);
app.use('/users', userRouter);
app.use('/orders', orderRouter);
app.use('/stats', statesRouter);
app.use(GlobalErrorHandler)
