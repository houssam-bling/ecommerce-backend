import express from 'express';
import { loginUser, logoutUser, registerUser, refreshToken } from '../controller/authController.ts';
import { authRateLimit } from '../middleware/rateLimits.ts';
import { validateLogin, validateRegister } from '../middleware/validation.ts';
const Route = express.Router();

Route.post('/login', authRateLimit, validateLogin, loginUser);
Route.post('/logup', authRateLimit, validateRegister, registerUser);
Route.post('/refresh', authRateLimit, refreshToken);
Route.post('/logout', logoutUser);

export default Route;