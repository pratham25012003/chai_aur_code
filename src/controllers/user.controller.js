import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, userName, password } = req.body;

  if (
    [fullName, email, userName, password].some((field) => field?.trim === "")
  ) {
    throw new ApiError(400, "All field are required");
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  console.log("existed User : ", existedUser);

  if (existedUser) {
    throw new ApiError(409, "User with email or userName already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  console.log("req.files : ", req.files);
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError("400", "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url,
    email,
    password,
    userName: userName.toLowerCase(),
  });

  // .select("-password -refreshToken") means muzhe tum jab user doge findById karke
  //                                   tab password and refreshToken mat dena kyu ki
  //                                   client kya hi karega password and refresh token dekh ke

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log("body : ", req.body);

  if (!email || !password) {
    throw new ApiError(400, "Please Provide email and password");
  }

  const user = await User.findOne({ email });
  console.log("user : ", user);

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  console.log("isPasswordCorrect", isPasswordCorrect);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Incorrect password");
  }

  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    // byDefault coockie ko koi bhi modified kar sakta hai frontend se but httpOnly : true and secure : true
    // se sirf server se modified kar sakte hai
    httpOnly: true,
    secure: true,
  };

  // to set cookie  => cookie(name, value, options) => eg => cookie(accessToken, accessToken, options)

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User Logged In Successfully"
      )
    );
});

const logOut = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      //  return upadted document, new : true is depricated,
      // "after" means update ke baad vala document
      // "before" means update ke pehale wala document
      returnDocument: "after",
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decoded = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRETE
    );
  
    const user = await User.findById(decoded?._id);
  
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
  
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
  
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
  
    user.refreshToken = refreshToken;
    user.save({ validateBeforeSave: false });
  
    const options = {
      httpOnly: true,
      secure: true,
    };
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, {accessToken, refreshToken}, "Access Token Refreshed")
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token")
  }

});

const changeCurrentPassword = asyncHandler( async (req, res) =>{
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    user.save({ validateBeforeSave: false });

    return res.status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))

});

const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json( new ApiResponse(200, req.user, "current user fetched successfully"))
});

const updateAccountDetails = asyncHandler( async (req, res) =>{
    const  {fullName, email} = req.body;

    if( !fullName || !email ){
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        { returnDocument: "after" }
    ).select("-password");

    return res
    .status(200)
    .json( new ApiResponse(200, user, "Account details updated Successfully"))

});

const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            returnDocument: "after"
        }
    ).select("-password")

    return res
    .status(200)
    .json( new ApiResponse(200, user, "Avatar Updated Succssfully") )

});

const updateUserCoverImage = asyncHandler( async(req, res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400, "coverImage file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading coverImage");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {
            returnDocument: "after"
        }
    ).select("-password")

    return res
    .status(200)
    .json( new ApiResponse(200, user, "coverImage updated successfully"))

})

export { 
    registerUser,
    loginUser, 
    logOut, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};
