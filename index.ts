import {app} from './app.ts'
import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(()=>{
    console.log("connected to mongoDB")
}).catch((err)=>{
    console.log(err)
})

app.listen(3000,()=>{
    console.log("i am listen 3000")
})
