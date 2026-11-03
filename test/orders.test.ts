import dotenv from 'dotenv';
dotenv.config();

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../app.ts';
import { orderModel } from '../model/order.ts';
import { productModel } from '../model/product.ts';
import { userModel } from '../model/user.ts';
import { generateToken } from '../utils/jwt.ts';

let adminId: mongoose.Types.ObjectId;
let adminToken: string;
let userId: mongoose.Types.ObjectId;
let userToken: string;

const address = {
    street: '1 Test Street',
    city: 'Test City',
    state: 'Test State',
    zipCode: '12345',
    country: 'Test Country',
};

beforeAll(async () => {
    await mongoose.connect(process.env.TEST_URI as string, {
        dbName: `orders_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
    });
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Promise.all([
        orderModel.deleteMany({}),
        productModel.deleteMany({}),
        userModel.deleteMany({}),
    ]);
    const [admin, user] = await userModel.create([
        {
            fullname: 'Order Admin',
            dateOfBirth: '1990-01-01',
            email: 'orders-admin@example.com',
            password: 'test-password',
            gender: 'male',
            role: 'admin',
        },
        {
            fullname: 'Order User',
            dateOfBirth: '1995-01-01',
            email: 'orders-user@example.com',
            password: 'test-password',
            gender: 'female',
            role: 'user',
        },
    ]);

    adminId = admin._id;
    adminToken = generateToken({ id: adminId.toString(), role: admin.role });
    userId = user._id;
    userToken = generateToken({ id: userId.toString(), role: user.role });
});

describe('orders API', () => {
    it('creates an order using database product prices', async () => {
        const product = await productModel.create({
            productName: 'Order Product',
            productDescription: 'For order tests',
            productCategory: ['Books'],
            productMainImage: 'https://example.com/order.jpg',
            productPrice: 20,
            productCount: 5,
        });

        const response = await request(app)
            .post('/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                products: [{ productId: product._id.toString(), quantity: 2,price:product.productPrice}],
                shippingAddress: address,
        });

        console.log(response.body)
        expect(response.status).toBe(201);
        expect(response.body.order.totalPrice).toBe(40);
        expect(response.body.order.userId).toBe(userId.toString());
    });

    it('rejects invalid order bodies and client-supplied totals', async () => {
        const response = await request(app)
            .post('/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                products: [{ productId: 'not-an-id', quantity: 0 }],
                shippingAddress: address,
                totalPrice: 1,
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid request body');
        await expect(orderModel.countDocuments()).resolves.toBe(0);
    });

    it('rejects orders for quantities exceeding stock', async () => {
        const product = await productModel.create({
            productName: 'Low Stock Product',
            productDescription: 'For stock tests',
            productCategory: ['Books'],
            productMainImage: 'https://example.com/stock.jpg',
            productPrice: 20,
            productCount: 1,
        });

        const response = await request(app)
            .post('/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                products: [{ productId: product._id.toString(), quantity: 2 }],
                shippingAddress: address,
        });
        console.log(response.body)

        expect(response.status).toBe(400);
        await expect(orderModel.countDocuments()).resolves.toBe(0);
    });

    it('rejects orders with an incomplete shipping address', async () => {
        const response = await request(app)
            .post('/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                products: [{ productId: new mongoose.Types.ObjectId().toString(), quantity: 1 }],
                shippingAddress: { city: 'Test City' },
            });

        expect(response.status).toBe(400);
        await expect(orderModel.countDocuments()).resolves.toBe(0);
    });

    it('lets users list and retrieve only their own orders', async () => {
        const order = await orderModel.create({
            userId,
            products: [],
            shippingAddress: address,
            totalPrice: 0,
        });

        const listResponse = await request(app)
            .get('/orders')
            .set('Authorization', `Bearer ${userToken}`);
        expect(listResponse.status).toBe(200);
        expect(listResponse.body).toHaveLength(1);

        const ownOrderResponse = await request(app)
            .get(`/orders/${order._id}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(ownOrderResponse.status).toBe(200);
        expect(ownOrderResponse.body._id).toBe(order._id.toString());

        const forbiddenOrder = await orderModel.create({
            userId: adminId,
            products: [],
            shippingAddress: address,
            totalPrice: 0,
        });
        const forbiddenResponse = await request(app)
            .get(`/orders/${forbiddenOrder._id}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(forbiddenResponse.status).toBe(403);
    });

    it('lets admins list all orders and update an order status', async () => {
        const order = await orderModel.create({
            userId,
            products: [],
            shippingAddress: address,
            totalPrice: 0,
        });

        const listResponse = await request(app)
            .get('/orders/admin')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(listResponse.status).toBe(200);
        expect(listResponse.body).toHaveLength(1);

        const statusResponse = await request(app)
            .patch(`/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'shipped' });
        expect(statusResponse.status).toBe(200);
        expect(statusResponse.body.order.status).toBe('shipped');
    });

    it('lets admins delete orders', async () => {
        const order = await orderModel.create({
            userId,
            products: [],
            shippingAddress: address,
            totalPrice: 0,
        });

        const response = await request(app)
            .delete(`/orders/${order._id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Order deleted');
        await expect(orderModel.findById(order._id)).resolves.toBeNull();
    });

    it('rejects invalid order statuses', async () => {
        const order = await orderModel.create({
            userId,
            products: [],
            shippingAddress: address,
            totalPrice: 0,
        });

        const response = await request(app)
            .patch(`/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'invalid' });

        expect(response.status).toBe(400);
        await expect(orderModel.findById(order._id).then((savedOrder) => savedOrder?.status))
            .resolves.toBe('pending');
    });
});
