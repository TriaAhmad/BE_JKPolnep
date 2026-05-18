import mongoose from "mongoose";
import {DATABASE_URL} from "./env";

const connect = async () => {
    try {
        await mongoose.connect(DATABASE_URL,{
            dbName: "db-event",
        });
        return Promise.resolve("Database Connected!");
    } catch (error) {
        return Promise.reject(error);
    }
};

export default connect;