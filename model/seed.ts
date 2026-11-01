// seed.ts
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker/locale/en';
import { productModel } from './product.ts';

const MONGO_URI = 'mongodb+srv://houssam:12312300@cluster0.lxiceac.mongodb.net/ecomerce?appName=Cluster0';

/**
 * كيولد منتج واحد يحترم الـ validator ديال productOfferPrice
 */
function generateProduct() {
    const productPrice = faker.number.int({ min: 100, max: 5000 });
    const productIsOffer = faker.datatype.boolean();

    let productOfferPrice: number | undefined = undefined;

    if (productIsOffer) {
        // عرض بين 10% و 90% من السعر الأصلي (مضمون أصغر من productPrice)
        productOfferPrice = faker.number.int({
            min: Math.floor(productPrice * 0.1),
            max: Math.floor(productPrice * 0.9),
        });
    }
    // إلا ماشي عرض، كنخليوه undefined باش الـ validator ما يرفضوش

    const categories = ['Electronics', 'Clothes', 'Food', 'Books', 'Sports'];

    return {
        productName: faker.commerce.productName(),
        productDescription: faker.commerce.productDescription(),
        productCategory: faker.helpers.arrayElements(
            categories,
            faker.number.int({ min: 1, max: 2 })
        ),
        productMainImage: faker.image.url(),
        productSideImages: Array.from(
            { length: faker.number.int({ min: 0, max: 3 }) },
            () => faker.image.url()
        ),
        productPrice,
        productInStock: faker.datatype.boolean(),
        productIsOffer,
        productCount: faker.number.int({ min: 0, max: 200 }),
        productOfferPrice,
    };
}

async function seed() {
    try {
        await mongoose.connect( MONGO_URI as string);
        console.log('✅ Connected to MongoDB');

        // 1. نحيدو الداتا القديمة (حذر: هاد السطر كيمحي كل المنتجات!)
        await productModel.deleteMany({});
        console.log('🧹 Cleared old products');

        // 2. نولد 50 منتج
        const products = Array.from({ length: 50 }, () => generateProduct());
        console.log(`📦 Generated ${products.length} products`);

        // 3. ندخلوهم عبر Mongoose (الـ validators كيخدمو)
        const inserted = await productModel.insertMany(products, {
            ordered: false, // يلا طاح واحد، يكمل بالباقي
        });

        console.log(`🎉 Inserted ${inserted.length} products successfully`);
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            console.error('❌ Validation error:', error.errors);
        } else if (error.writeErrors) {
            console.error(
                `❌ Some inserts failed. Inserted: ${error.result?.insertedCount ?? 0}`
            );
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