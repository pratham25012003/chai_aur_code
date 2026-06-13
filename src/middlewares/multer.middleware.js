import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // cb means callback function
    // "./public/temp" => es jagah ham file rakhana chahenge
    cb(null, "./public/temp")
  },

//    normall ham( client ) jab koi bhi http request karte ho request handler ko req to mil jati hai par file nahi milti 
//   esiliye ham file ke liye multer ya express-fileupload ka use karte hai 
//  file => user ne jo file bheji hai request karte time vo milti hai
//  file.fieldname => us file ka fieldname 
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    // cb(null, file.fieldname + '-' + uniqueSuffix)
    cb(null, file.originalname)
  }
})

export const upload = multer({ storage })