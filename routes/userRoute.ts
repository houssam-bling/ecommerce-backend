import express from 'express';
import {
    deleteUser,
    getMyProfile,
    getUserById,
    getUsers,
    updateMyProfile,
    updateUser,
} from '../controller/userController.ts';
import { authorize, protect } from '../middleware/auth.ts';
import { validateMyProfile, validateUserUpdate } from '../middleware/validation.ts';

const Route = express.Router();

Route.get('/me', protect, getMyProfile);
Route.patch('/me', protect, validateMyProfile, updateMyProfile);
Route.get('/', protect, authorize('admin'), getUsers);
Route.get('/:id', protect, authorize('admin'), getUserById);
Route.patch('/:id', protect, authorize('admin'), validateUserUpdate, updateUser);
Route.delete('/:id', protect, authorize('admin'), deleteUser);

export default Route;
