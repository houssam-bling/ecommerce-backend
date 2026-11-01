import mongoose from 'mongoose'


const schema = mongoose.Schema;

interface productInterface extends mongoose.Document{
    productName:string,
    productDescription:string,
    productCategory:string[],
    productMainImage:string,
    productSideImages?:string[],
    productPrice:number,
    productInStock?:boolean,
    productIsOffer?:boolean,
    productCount:number,
    productOfferPrice?:number,
    productSales?:number,

}

const productSchema = new schema<productInterface>({

    productName:{type:String,required:true},
    productDescription:{type:String,required:true},
    productCategory:[{type:String,required:true}],
    productMainImage:{type:String,required:true},
    productSales:{type:Number,required:false,default:0,min:[0,"productSales must be greater than or equal to 0"],select:false},
    productSideImages:[{type:String,required:false}],
    productPrice:{type:Number,required:true,min:[0,"productPrice must be greater than or equal to 0"]},
    productInStock:{type:Boolean,required:false,default:true},
    productIsOffer:{type:Boolean,required:false,default:false},
    productCount:{type:Number,required:true,min:[0,"productCount must be greater than or equal to 0"]},

    productOfferPrice:{type:Number,required:false,
        validate:function(this:productInterface,value:number)
        {
            if(this.productIsOffer && !value){
                throw new Error("productOfferPrice is required when productIsOffer is true")
            }
            if(!this.productIsOffer && value){
                throw new Error("productOfferPrice should not be provided when productIsOffer is false")
            }
            if(value && value >= this.productPrice){
                throw new Error("productOfferPrice should be less than productPrice")
            }
            return true
        },
    }
},{timestamps:true});


export const productModel = mongoose.model<productInterface>('product',productSchema)