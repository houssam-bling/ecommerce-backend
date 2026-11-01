import express from 'express';
import { loginUser,registerUser, refreshToken } from '../controller/authController.ts';
const Route = express.Router();

Route.post('/login', loginUser);
Route.post('/logup', registerUser);
Route.post('/refresh', refreshToken);

export default Route;