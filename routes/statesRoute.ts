import { authorize, isOwnerOrAdminOrder, protect } from "../middleware/auth.ts";
import express from 'express'
import {getStats} from '../controller/statesController.ts'

const router = express.Router();

router.get("/",protect,authorize("admin"), getStats);

export default router;