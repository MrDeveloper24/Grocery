import Order from "../models/Order.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import stripe from "stripe";

// place Order COD : /api/order/cod
export const placeOrderCOD = async (req, res) => {
  try {
    // prefer authenticated user id, but accept fallback from body
    const userId = req.userId || req.body?.userId;
    let { items, address } = req.body;
    if (!address || items.length === 0) {
      return res.json({ success: false, message: "invalid data" });
    }
    // ensure quantities are numbers and calculate amount
    let amount = 0;
    for (const item of items) {
      // coerce or validate quantity
      item.quantity = Number(item.quantity || 0);
      const product = await Product.findById(item.product);
      if (!product)
        return res
          .status(400)
          .json({ success: false, message: "Invalid product in items" });
      amount += product.offerPrice * item.quantity;
    }
    // tax carge (2%)
    amount += Math.floor(amount * 0.02);

    // create order with boolean isPaid set to false for COD
    await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "COD",
      isPaid: false,
    });
    return res.json({ success: true, message: "order placed succeddfully" });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};
// PLACE ORDER STRIP : /api/order/stripe
export const placeOrderStripe = async (req, res) => {
  try {
    // prefer authenticated user id, but accept fallback from body
    const userId = req.userId || req.body?.userId;
    const { origin } = req.headers;

    // get the request payload
    let { items, address } = req.body;

    if (!address || !items || items.length === 0) {
      return res.json({ success: false, message: "invalid data" });
    }

    let productData = [];

    // ensure quantities are numbers and calculate amount
    let amount = 0;
    for (const item of items) {
      // coerce or validate quantity
      item.quantity = Number(item.quantity || 0);
      const product = await Product.findById(item.product);
      if (!product)
        return res
          .status(400)
          .json({ success: false, message: "Invalid product in items" });
      productData.push({
        name: product.name,
        price: product.offerPrice,
        quantity: item.quantity,
      });
      amount += product.offerPrice * item.quantity;
    }
    // tax carge (2%)
    amount += Math.floor(amount * 0.02);

    // create order with boolean isPaid set to false for online orders until payment succeeds
    const order = await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "Online",
      isPaid: false,
    });
    // stripe get way initialize
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    // create line item for stripe
    const line_items = productData.map((item) => {
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.floor(item.price + item.price * 0.02) * 100,
        },
        quantity: item.quantity,
      };
    });
    // creat session
    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader?next=my-orders`,
      cancel_url: `${origin}/cart`,
      metadata: {
        orderId: order._id.toString(),
        userId,
      },
    });
    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

// get orders by userId : /api/order/user
export const getUserOrders = async (req, res) => {
  try {
    // prefer authenticated user id
    const userId = req.userId || req.body?.userId;

    const orders = await Order.find({
      userId,
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

// STRIPE WEBHOOKS TO VERIFY PAYMENT action : /stripe
export const stripeWebhooks = async (request, response) => {
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

  const sig = request.headers["stripe-signature"];

  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    response.status(400).send(`webhooks error: ${error.message}`);
  }
  // handle the event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      // getting session metadata
      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      const { orderId, userId } = session.data[0].metadata;
      // mark payment as paid
      await Order.findByIdAndUpdate(orderId, { isPaid: true });
      // clear user cart
      await User.findByIdAndUpdate(user, { cartItems: {} });
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      // getting session metadata
      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      const { orderId } = session.data[0].metadata;
      await Order.findByIdAndDelete(orderId);
      break;
    }

    default:
      console.error(`Unhandle event type ${event.type}`);
      break;
  }
  response.json({ received: true });
};

// get all orders (for seller / admin ) : /api/orders/seller
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};
