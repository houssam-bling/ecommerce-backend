import dotenv from 'dotenv';

dotenv.config(); // ⬅️ زيد هادي
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import {app} from '../app.ts'; 

let authToken : string;
let userId : string;   

beforeAll(async () => {
  await mongoose.connect(process.env.TEST_URI as string);
});

// 2. قطع الاتصال
afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany(); 
  }})
describe('auth API', () => {
  it('allows the configured frontend origin to send credentialed requests', async () => {
    const response = await request(app)
      .options('/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects invalid login request data', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid request body');
  });


  it('add new user', async () => {
    const response = await request(app)
      .post('/auth/logup')
      .send({ 
        email: 'houssam@gmail.com',
        fullname: 'houssamzefzf',
        password: "1235488888" ,
        gender: "male" ,
        dateOfBirth:"2007-12-11"
      });
    expect(response.body.token).toBeDefined();
  });
  it('login exist user', async () => {

    await request(app)
      .post('/auth/logup')
      .send({ 
        email: 'housssam@gmail.com',
        fullname: 'houssamzefzf',
        password: "1235488888",
        gender: "male",
        dateOfBirth: "2007-12-11"
      });
    const response = await request(app)
      .post('/auth/login')
      .send({ 
        email: 'housssam@gmail.com',
        password: "1235488888" 
      });
      console.log("LOGIN ERROR:", response.body);

    expect(response.status).toBe(200
    
    );
  });

    it('login wrong user', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ 
        email: 'houssam@gmail.com',
        password: "1235488888" 
      });
      console.log("LOGIN ERROR:", response.body);

    expect(response.status).toBe(404
    
    );
  });
  it('login wrong password user', async () => {
      await request(app)
      .post('/auth/logup')
      .send({ 
        email: 'houssam@gmail.com',
        fullname: 'houssamzefzf',
        password: "1235488888" ,
        gender: "male" ,
        dateOfBirth:"2007-12-11"
      });
    const response = await request(app)
      .post('/auth/login')
      .send({ 
        email: 'houssam@gmail.com',
        password: "wrongpassword" 
      });
      console.log("LOGIN ERROR:", response.body);

    expect(response.status).toBe(401
    
    );
  });
  it('should refresh token successfully', async () => {
    const loginResponse = await request(app)
      .post('/auth/logup')
      .send({ 
        email: 'houssam@gmail.com',
        fullname: 'houssamzefzf',
        password: "1235488888" ,
        gender: "male" ,
        dateOfBirth:"2007-12-11"
      });

    const cookies = loginResponse.headers['set-cookie']; 
    console.log("COOKIES:", cookies);
    const refreshResponse = await request(app)
        .post('/auth/refresh')
        .set('Cookie', cookies);

console.log("REFRESH BODY:", refreshResponse.body);
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body).toHaveProperty('token');
});


});