import jwt from "jsonwebtoken";

const authSeller = (req, res, next) => {
    const { sellerToken } = req.cookies;

    if(!sellerToken){
        return res.json({success:false, message:"Unauthorized Access"});
    }
    try {
        const tokenDecode = jwt.verify(sellerToken, process.env.JWT_SECRET);  
        if(tokenDecode.email === process.env.SELLER_EMAIL){
          next();
        }else{
          return res.json({success:false, message:"No Authorized"});
        }
} catch (error) {
        console.error(error.message);
        return  res.json({success:false, message:"No Authorized"});
    }
}

export default authSeller;