import express from 'express';
import { upload } from '../config/multer.js';
import authSeller from '../middlewares/authSeller.js';
import { addProduct, changeStock, productById, productList } from '../controllers/productController.js';

const productRouter = express.Router();

// check auth first, then accept image uploads under field name `images` (multiple)
productRouter.post('/add', authSeller, upload.array(["images"]), addProduct);
productRouter.get('/list', productList);
productRouter.post('/id', productById);
productRouter.post('/stock', authSeller, changeStock);


export default productRouter;