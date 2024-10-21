const crypto = require("crypto");
const Course = require("../models/courseModel");
const Order = require("../models/orderModel");
const SECRET_KEY = process.env.CLICK_SECRET_KEY;

exports.preparePayment = async (req, res) => {
  console.log("Received body:", req.body);

  const _postData = req.body?.Request?._postData; // Safely accessing _postData
  if (!_postData) {
    console.log("Missing required fields in _postData");
    return res.status(400).json({
      error: -1,
      error_note: "Missing required fields in _postData",
    });
  }
  const {
    click_trans_id,
    service_id,
    click_paydoc_id,
    merchant_trans_id,
    amount,
    action,
    sign_time,
    sign_string,
    param2,
  } = _postData;

  try {
    if (
      click_trans_id === undefined ||
      service_id === undefined ||
      click_paydoc_id === undefined ||
      merchant_trans_id === undefined ||
      amount === undefined ||
      action === undefined ||
      sign_time === undefined ||
      sign_string === undefined ||
      param2 === undefined
    ) {
      console.log("Missing required fields");
      return res.status(400).json({
        error: -1,
        error_note: "Missing required fields",
      });
    }

    const course = await Course.findOne({ _id: param2 });
    if (!course) {
      return res.status(400).json({
        error: -9,
        error_note: "Course not found",
      });
    }

    const order = await Order.findOne({ invoiceNumber: merchant_trans_id });
    if (!order) {
      return res.status(400).json({
        error: -5,
        error_note: "Order not found",
      });
    }

    if (order.amount !== amount) {
      return res.status(400).json({
        error: -9,
        error_note: "Incorrect amount",
      });
    }

    if (order.course_id.toString() !== param2) {
      return res.status(400).json({
        error: -9,
        error_note: "Incorrect course",
      });
    }

    const expectedSignString = crypto
      .createHash("md5")
      .update(
        `${click_trans_id}${service_id}${SECRET_KEY}${merchant_trans_id}${amount}${action}${sign_time}`
      )
      .digest("hex");
      console.log(expectedSignString)

    if (sign_string !== expectedSignString) {
      console.log("Invalid sign string");
      return res.status(400).json({
        error: -1,
        error_note: "Invalid sign string",
      });
    }

    const merchant_prepare_id = order._id;

    // Send successful response
    return res.status(200).json({
      result: {
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id,
        error: 0,
        error_note: "Success",
      },
    });
  } catch (error) {
    console.error("Error in preparePayment:", error);
    return res.status(500).json({
      error: -3,
      error_note: "Server error",
    });
  }
};
