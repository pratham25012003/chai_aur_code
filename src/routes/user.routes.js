import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js" 

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

export default router