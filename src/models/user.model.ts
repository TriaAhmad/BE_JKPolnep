import mongoose from "mongoose";
import { encrypt } from "../utils/encryption";
import {renderMailHtml, sendMail} from "../utils/mail/mail";
import { CLIENT_HOST, EMAIL_SMTP_USER } from "../utils/env";
import { ROLES } from "../utils/constant";

export interface User{
    fullname: string;
    username: string;
    email: string;
    password: string;
    role: string;
    profilePicture: string;
    isActive: boolean;
    activationCode: string;
    // FCM token untuk push notification
    fcmToken?: string;
    createdAt?: string;
}

const Schema = mongoose.Schema;

const UserSchema = new Schema<User>({
    fullname: {
        type: Schema.Types.String,
        required: true,
    },
    username: {
        type: Schema.Types.String,
        required: true,
        unique: true,
    },
    email: {
        type: Schema.Types.String,
        required: true,
        unique: true,
    },
    password: {
        type: Schema.Types.String,
        required: true,
    },
    role: {
        type: Schema.Types.String,
        enum: [ROLES.ADMIN, ROLES.USER],
        default: ROLES.USER,
    },
    profilePicture: {
        type: Schema.Types.String,
        default: "user.jpg",
    },
    isActive: {
        type: Schema.Types.Boolean,
        default: false,
    },
    activationCode: {
        type: Schema.Types.String,
    },
    // Menyimpan FCM Device Token dari frontend/mobile
    fcmToken: {
        type: Schema.Types.String,
        default: null,
    },
},{
    timestamps: true,
});

UserSchema.pre("save", function(next) {
    const user = this;
    user.password = encrypt(user.password);
    user.activationCode = encrypt(user.id);
    next();
});

UserSchema.post("save", async function(doc, next){
   try {
    const user = doc;
    console.log("Send Email to: ", user);
    const contentMail = await renderMailHtml("registration-success.ejs", {
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        createdAt: user.createdAt,
        activationLink: `${CLIENT_HOST}/auth/activation?code=${user.activationCode}`,
    });
    await sendMail({
        from: EMAIL_SMTP_USER,
        to: user.email,
        subject: "Aktivasi Akun",
        html: contentMail,
    });
   } catch (error) {
    console.log(error)
   } finally {
    next();
   }
});

UserSchema.methods.toJSON = function (){
    const user = this.toObject();
    delete user.password;
    return user;
};

const UserModel = mongoose.model("User", UserSchema);

export default UserModel;
