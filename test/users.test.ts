import dotenv from 'dotenv';
dotenv.config();

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../app.ts';
import { tokenModel } from '../model/token.ts';
import { userModel } from '../model/user.ts';
import { generateToken } from '../utils/jwt.ts';

let adminToken: string;
let userId: mongoose.Types.ObjectId;
let userToken: string;

beforeAll(async () => {
    await mongoose.connect(process.env.TEST_URI as string, {
        dbName: `users_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
    });
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Promise.all([tokenModel.deleteMany({}), userModel.deleteMany({})]);
    const [admin, user] = await userModel.create([
        {
            fullname: 'Test Admin',
            dateOfBirth: '1990-01-01',
            email: 'users-admin@example.com',
            password: 'test-password',
            gender: 'male',
            role: 'admin',
        },
        {
            fullname: 'Test User',
            dateOfBirth: '1995-01-01',
            email: 'users-user@example.com',
            password: 'test-password',
            gender: 'female',
            role: 'user',
        },
    ]);

    adminToken = generateToken({ id: admin._id.toString(), role: admin.role });
    userId = user._id;
    userToken = generateToken({ id: userId.toString(), role: user.role });
});

describe('users API', () => {
    it('returns the signed-in user profile without exposing the password', async () => {
        const response = await request(app)
            .get('/users/me')
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);
        expect(response.body._id).toBe(userId.toString());
        expect(response.body.password).toBeUndefined();
    });

    it('updates the signed-in profile but does not allow changing the role', async () => {
        const response = await request(app)
            .patch('/users/me')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ fullname: 'Updated User' });

        expect(response.status).toBe(200);
        expect(response.body.user.fullname).toBe('Updated User');
        expect(response.body.user.role).toBe('user');

        const roleChange = await request(app)
            .patch('/users/me')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ role: 'admin' });
        expect(roleChange.status).toBe(400);
        expect(roleChange.body.message).toBe('Invalid request body');
    });

    it('rejects invalid profile update fields', async () => {
        const response = await request(app)
            .patch('/users/me')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ fullname: '   ' });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid request body');
    });

    it('requires admin access to list and retrieve users', async () => {
        const denied = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${userToken}`);
        expect(denied.status).toBe(403);

        const listResponse = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(listResponse.status).toBe(200);
        expect(listResponse.body).toHaveLength(2);
        expect(listResponse.body[0].password).toBeUndefined();

        const getResponse = await request(app)
            .get(`/users/${userId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(getResponse.status).toBe(200);
        expect(getResponse.body._id).toBe(userId.toString());
        expect(getResponse.body.password).toBeUndefined();
    });

    it('lets admins update and delete users', async () => {
        const updateResponse = await request(app)
            .patch(`/users/${userId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ isActive: false });
        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.user.isActive).toBe(false);

        const deleteResponse = await request(app)
            .delete(`/users/${userId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(deleteResponse.status).toBe(200);
        await expect(userModel.findById(userId)).resolves.toBeNull();
    });
});
