import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MOngoDB Connected !! DB HOST: ${connectionInstance.connection.host}`)
        // console.log(`\n MOngoDB Connected !! DB HOST: ${connectionInstance}`)
    }catch(err){
        console.log("Error connecting to MongoDB:", err);
        process.exit(1);
    }
}

export default connectDB; 