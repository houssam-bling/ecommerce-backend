import dotenv from 'dotenv';
dotenv.config();

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { app } from '../app.ts';
import { productModel } from '../model/product.ts';
import { userModel } from '../model/user.ts';
import { generateToken } from '../utils/jwt.ts';

let adminToken: string;

beforeAll(async () => {
    await mongoose.connect(process.env.TEST_URI as string, {
        dbName: `products_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
    });
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

beforeEach(async () => {
    await productModel.deleteMany({});
    await userModel.deleteMany({});
    const admin = await userModel.create({
        fullname: 'Product Test Admin',
        dateOfBirth: '1990-01-01',
        email: 'product-admin@example.com',
        password: 'test-password',
        gender: 'male',
        role: 'admin',
    });
    adminToken = generateToken({ id: admin._id.toString(), role: admin.role });
});

describe('products API', () => {
    it('requires authentication to create a product', async () => {
        const response = await request(app)
            .post('/products')
            .send({
                productName: 'Unauthorized product',
                productDescription: 'Should not be created',
                productCategory: ['Books'],
                productMainImage: 'https://example.com/product.jpg',
                productPrice: 25,
                productCount: 10,
            });

        expect(response.status).toBe(401);
        await expect(productModel.countDocuments()).resolves.toBe(0);
    });

    it('rejects product creation for a non-admin user', async () => {
        const user = await userModel.create({
            fullname: 'Product Test User',
            dateOfBirth: '1990-01-01',
            email: 'product-user@example.com',
            password: 'test-password',
            gender: 'male',
            role: 'user',
        });
        const userToken = generateToken({ id: user._id.toString(), role: user.role });

        const response = await request(app)
            .post('/products')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                productName: 'Forbidden product',
                productDescription: 'Should not be created',
                productCategory: ['Books'],
                productMainImage: 'https://example.com/product.jpg',
                productPrice: 25,
                productCount: 10,
            });

        expect(response.status).toBe(403);
        await expect(productModel.countDocuments()).resolves.toBe(0);
    });

    it('creates a product', async () => {
        const response = await request(app)
            .post('/products')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                productName: 'Created product',
                productDescription: 'A new product',
                productCategory: ['Books'],
                productMainImage: 'https://example.com/created.jpg',
                productPrice: 25,
                productCount: 10,
            });

        expect(response.status).toBe(201);
        expect(response.body.product.productName).toBe('Created product');
        await expect(productModel.countDocuments()).resolves.toBe(1);
    });

    it('rejects creating a product with missing required fields', async () => {
        const response = await request(app)
            .post('/products')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ productName: 'Incomplete product' });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
        await expect(productModel.countDocuments()).resolves.toBe(0);
    });

    it('updates a product', async () => {
        const product = await productModel.create({
            productName: 'Old name',
            productDescription: 'A product',
            productCategory: ['Books'],
            productMainImage: 'https://example.com/product.jpg',
            productPrice: 25,
            productCount: 10,
        });

        const response = await request(app)
            .put(`/products/${product._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ productName: 'Updated name' });

        expect(response.status).toBe(200);
        expect(response.body.product.productName).toBe('Updated name');
        await expect(productModel.findById(product._id).then((updated) => updated?.productName))
            .resolves.toBe('Updated name');
    });

    it('returns 404 when updating a product that does not exist', async () => {
        const response = await request(app)
            .put(`/products/${new mongoose.Types.ObjectId().toString()}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ productName: 'Updated name' });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Product not found');
    });

    it('deletes a product', async () => {
        const product = await productModel.create({
            productName: 'Deleted product',
            productDescription: 'A product',
            productCategory: ['Books'],
            productMainImage: 'https://example.com/product.jpg',
            productPrice: 25,
            productCount: 10,
        });

        const response = await request(app)
            .delete(`/products/${product._id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Product deleted');
        await expect(productModel.findById(product._id)).resolves.toBeNull();
    });

    it('returns 404 when deleting a product that does not exist', async () => {
        const response = await request(app).delete(
            `/products/${new mongoose.Types.ObjectId().toString()}`,
        ).set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Product not found');
    });

    it('returns a product by ID', async () => {
        const product = await productModel.create({
            productName: 'Product by ID',
            productDescription: 'A product',
            productCategory: ['Books'],
            productMainImage: 'https://example.com/product.jpg',
            productPrice: 25,
            productCount: 10,
        });

        const response = await request(app).get(`/products/${product._id}`);

        expect(response.status).toBe(200);
        expect(response.body.product.productName).toBe('Product by ID');
    });

    it('returns 404 when a product ID does not exist', async () => {
        const response = await request(app).get(
            `/products/${new mongoose.Types.ObjectId().toString()}`,
        );

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Product not found');
    });

    it('returns all products', async () => {
        await productModel.create({
            productName: 'Test product',
            productDescription: 'A product for testing',
            productCategory: ['Books'],
            productMainImage: 'https://example.com/product.jpg',
            productPrice: 25,
            productCount: 10,
        });

        const response = await request(app).get('/products');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].productName).toBe('Test product');
    });

    it('returns products with the requested pagination', async () => {
        const [olderProduct, newerProduct] = await productModel.create([
            {
                productName: 'First product',
                productDescription: 'The first product',
                productCategory: ['Books'],
                productMainImage: 'https://example.com/first.jpg',
                productPrice: 25,
                productCount: 10,
            },
            {
                productName: 'Second product',
                productDescription: 'The second product',
                productCategory: ['Books'],
                productMainImage: 'https://example.com/second.jpg',
                productPrice: 30,
                productCount: 5,
            },
        ]);

        const response = await request(app).get('/products?page=1&limit=1');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
    });

    it('returns popular products sorted by sales', async () => {
        await productModel.create([
            {
                productName: 'Less popular product',
                productDescription: 'Fewer sales',
                productCategory: ['Books'],
                productMainImage: 'https://example.com/less-popular.jpg',
                productPrice: 25,
                productCount: 10,
                productSales: 5,
            },
            {
                productName: 'Most popular product',
                productDescription: 'More sales',
                productCategory: ['Books'],
                productMainImage: 'https://example.com/most-popular.jpg',
                productPrice: 30,
                productCount: 5,
                productSales: 20,
            },
        ]);

        const response = await request(app).get('/products/popular?limit=1');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].productName).toBe('Most popular product');
        expect(response.body[0].productSales).toBe(20);
    });

    it('returns the newest products first', async () => {
        const [olderProduct, newerProduct] = await productModel.create([
            {
                productName: 'Older product',
                productDescription: 'Created earlier',
                productCategory: ['Books'],
                productMainImage: 'https://example.com/older.jpg',
                productPrice: 25,
                productCount: 10,
            },
            {
                productName: 'Newer product',
                productDescription: 'Created later',
                productCategory: ['Books'],
                productMainImage: 'https://example.com/newer.jpg',
                productPrice: 30,
                productCount: 5,
            },
        ]);
        await productModel.collection.updateOne(
            { _id: olderProduct._id },
            { $set: { createdAt: new Date('2025-01-01T00:00:00Z') } },
        );
        await productModel.collection.updateOne(
            { _id: newerProduct._id },
            { $set: { createdAt: new Date('2025-02-01T00:00:00Z') } },
        );

        const response = await request(app).get('/products/new?limit=1');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].productName).toBe('Newer product');
    });

    it('returns products in the requested category', async () => {
        await productModel.create([
            {
                productName: 'Category match',
                productDescription: 'A book',
                productCategory: ['Books'],
                productMainImage: 'https://example.com/book.jpg',
                productPrice: 25,
                productCount: 10,
            },
            {
                productName: 'Different category',
                productDescription: 'A sports product',
                productCategory: ['Sports'],
                productMainImage: 'https://example.com/sports.jpg',
                productPrice: 30,
                productCount: 5,
            },
        ]);

        const response = await request(app).get('/products/category/Books');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].productName).toBe('Category match');
    });
});
