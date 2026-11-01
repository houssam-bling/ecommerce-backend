import express from 'express';
import { getAllProducts } from '../controller/productsController.ts';
const Route = express.Router();

Route.get('/', getAllProducts);

export default Route;