import express from 'express';
import { getStore, updateStore } from '../controller/storeController.ts';
import { authorize, protect } from '../middleware/auth.ts';
import { validateStore } from '../middleware/validation.ts';

const Route = express.Router();

Route.get('/', getStore);
Route.put('/', protect, authorize('admin'), validateStore, updateStore);

export default Route;
