import dotenv from 'dotenv';
dotenv.config();

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../app.ts';
import { storeModel } from '../model/store.ts';
import { userModel } from '../model/user.ts';
import { generateToken } from '../utils/jwt.ts';

let adminToken: string;
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
        dbName: `store_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
    });
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

beforeEach(async () => {
    await storeModel.deleteMany({});
    await userModel.deleteMany({});
    const [admin, user] = await userModel.create([
        {
            fullname: 'Store Admin',
            dateOfBirth: '1990-01-01',
            email: 'store-admin@example.com',
            password: 'test-password',
            gender: 'male',
            role: 'admin',
        },
        {
            fullname: 'Store User',
            dateOfBirth: '1995-01-01',
            email: 'store-user@example.com',
            password: 'test-password',
            gender: 'female',
            role: 'user',
        },
    ]);

    adminToken = generateToken({ id: admin._id.toString(), role: admin.role });
    userToken = generateToken({ id: user._id.toString(), role: user.role });
});

describe('store API', () => {
    it('returns 404 when the store profile has not been configured', async () => {
        const response = await request(app).get('/store');

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Store profile not found');
    });

    it('lets an admin create store settings and serves them publicly', async () => {
        const updateResponse = await request(app)
            .put('/store')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Example Store',
                description: 'A test shop',
                email: 'shop@example.com',
                phone: '+123456789',
                logoUrl: 'https://example.com/logo.png',
                address,
            });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.store.name).toBe('Example Store');

        const getResponse = await request(app).get('/store');
        expect(getResponse.status).toBe(200);
        expect(getResponse.body.email).toBe('shop@example.com');
    });

    it('does not let regular users update store settings', async () => {
        const response = await request(app)
            .put('/store')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ name: 'Forbidden store', description: 'No access' });

        expect(response.status).toBe(403);
    });

    it('requires authentication to update store settings', async () => {
        const response = await request(app)
            .put('/store')
            .send({ name: 'Unauthorized store', description: 'No token' });

        expect(response.status).toBe(401);
    });

    it('rejects invalid store settings', async () => {
        const response = await request(app)
            .put('/store')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'not-an-email' });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid request body');
    });
});
