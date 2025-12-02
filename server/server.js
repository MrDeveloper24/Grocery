import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './config/cloudinary.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';
import { stripeWebhooks } from './controllers/orderController.js';

// app
const app = express();
const PORT = process.env.PORT || 3000;
await connectDB();
await connectCloudinary();

// allowed origins
const allowedOrigins = ['http://localhost:5173'];

app.post('/stripe', express.raw({type: "application/json"}), stripeWebhooks)

// middlewares
app.use(express.json());
app.use(cookieParser());
// allow cookies to be sent from the client (credentials:true) — note plural
app.use(cors({ origin: allowedOrigins, credentials: true }));

// routes 
app.get('/',(req,res)=>{
    res.send("API IS WORKING")
});
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);

app.listen(PORT, ()=>{
    console.log(`Server is runing on http://localhost:${PORT}`)
})