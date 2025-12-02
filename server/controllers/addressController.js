import Address from "../models/Address.js";

// add address : /api/address/add
export const addAddress = async (req, res) => {
  try {
    // take user id from middleware (req.userId) or body fallback
    const userId = req.userId || req.body?.userId;
    const { address } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // create address with validated field names
    const created = await Address.create({ ...address, userId });

    return res.json({ success: true, message: "Address added successfully", address: created });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// get address : /api/address/get
export const getAddress = async (req, res) => {
  try {
    const userId = req.userId || req.body?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const addresses = await Address.find({ userId });
    res.json({ success: true, addresses });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
