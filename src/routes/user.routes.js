import { Router } from "express";
import { registerUser, loginUser, logOut } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js" 
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    // don image ghenar ahhe avatar and coverImage navachi frontend kadun and donhi image 1, 1 ghenar 
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//  secure routes 
router.route("/logout").post( verifyJWT, logOut)

export default router