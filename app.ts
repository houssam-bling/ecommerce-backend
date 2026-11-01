import express, { type Express, type Request, type Response } from 'express';
import productsRouter from './routes/productsRoute.ts'
import authRouter from './routes/authRoute.ts'
import { GlobalErrorHandler } from './middleware/globalErrorHandler.ts';
import cookieParser from 'cookie-parser';
export const app : Express = express();
app.use(express.json());
app.use(cookieParser());
app.use('/products',productsRouter)
app.use('/auth',authRouter)
app.use(GlobalErrorHandler)


