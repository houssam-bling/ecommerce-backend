import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { faker } from '@faker-js/faker/locale/en';
import { productModel } from './product.ts';

const MONGO_URI = process.env.MONGODB_URI as string;

function generateProduct() {
    const productPrice = faker.number.int({ min: 100, max: 5000 });
    const productIsOffer = faker.datatype.boolean();

    let productOfferPrice: number | undefined = undefined;

    if (productIsOffer) {
        productOfferPrice = faker.number.int({
            min: Math.floor(productPrice * 0.1),
            max: Math.floor(productPrice * 0.9),
        });
    }

    const categories = ['Electronics', 'Clothes', 'Food', 'Books', 'Sports'];

    return {
        productName: faker.commerce.productName(),
        productDescription: faker.commerce.productDescription(),
        productCategory: faker.helpers.arrayElements(categories, faker.number.int({ min: 1, max: 2 })),
        productMainImage: faker.image.url(),
        productSideImages: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => faker.image.url()),
        productPrice,
        productInStock: faker.datatype.boolean(),
        productIsOffer,
        productCount: faker.number.int({ min: 0, max: 200 }),
        productOfferPrice,
        productSales: faker.number.int({ min: 0, max: 500 }), // ⬅️ زدنا هادي هنا
    };
}

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        await productModel.deleteMany({});
        console.log('🧹 Cleared old products');

        // درنا 30 منتج كيف ما طلبتي قبل
        const products = Array.from({ length: 30 }, () => generateProduct());
        console.log(`📦 Generated ${products.length} products`);

        const inserted = await productModel.insertMany(products, { ordered: false });
        console.log(`🎉 Inserted ${inserted.length} products successfully`);
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            console.error('❌ Validation error:', error.errors);
        } else if (error.writeErrors) {
            console.error(`❌ Some inserts failed. Inserted: ${error.result?.insertedCount ?? 0}`);
            error.writeErrors.forEach((e: any) => {
                console.error(`  - Row ${e.index}: ${e.errmsg}`);
            });
        } else {
            console.error('❌ Error:', error);
        }
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected');
        process.exit(0);
    }
}

seed();