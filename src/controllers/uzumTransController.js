const bcrypt = require('bcryptjs');
const { Buffer } = require("buffer");

const Order = require("../models/orderModel");
const Course = require("../models/courseModel");
const Invoice = require("../models/invoiceModel");
const User = require("../models/userModel");

const realServiceId = 498614016;

const loginUzumBank = async function (req, res) {
  const { login, password } = req.body;

  try {
    const user = await User.findOne({ login: login });

    if (!user) {
      return res.status(401).json({ message: "Invalid login or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid login or password" });
    }

    const credentials = Buffer.from(`${login}:${password}`).toString("base64");

    res.status(200).json({ message: "Authentication successful", token: credentials });
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log(error);
  }
};

const checkTransaction = async (req, res) => {
  const { serviceId, timestamp, params } = req.body;

  console.log("Received request in checkPerform:", req.body);

  if (!serviceId || serviceId !== realServiceId) {
    return res.status(400).json({
      timestamp: timestamp,
      status: "FAILED",
      errorCode: "10006",
    });
  }

  if (
    !params ||
    !params.courseId ||
    !String(params.amount) ||
    params.amount < 0 ||
    !params.clientName ||
    !params.clientAddress ||
    !params.clientPhone ||
    !params.passport ||
    !params.invoiceNumber
  ) {
    return res.status(400).json({
      serviceId: serviceId,
      timestamp: timestamp,
      status: "FAILED",
      errorCode: "10007",
    });
  }

  try {
    const course = (await Course.findById(params.courseId)) || null;

    if (!course || course?.price !== params.amount) {
      return res.status(400).json({
        serviceId: serviceId,
        timestamp: timestamp,
        status: "FAILED",
        errorCode: "10002",
      });
    }

    res.status(200).json({
      serviceId: serviceId,
      timestamp: timestamp,
      status: "OK",
      data: {
        courseId: {
          value: course._id,
        },
        invoiceNumber: {
          value: params.invoiceNumber,
        },
        amount: {
          value: params.amount,
        },
        clientName: {
          value: params.clientName,
        },
        clientAddress: {
          value: params.clientAddress,
        },
        clientPhone: {
          value: params.clientPhone,
        },
        passport: {
          value: params.passport,
        },
        tgUsername: {
          value: params.tgUsername,
        },
      },
    });
  } catch (error) {
    console.log("Received error: ", error);
    res.status(500).json({
      status: "FAILED",
      errorCode: "99999",
    });
  }
};

const createTransaction = async (req, res) => {
  const { serviceId, timestamp, transId, params, amount } = req.body;

  if (!serviceId || serviceId !== realServiceId) {
    return res.status(400).json({
      transId: transId,
      status: "FAILED",
      transTime: Date.now(),
      errorCode: "10006",
    });
  }

  if (!amount || !timestamp || !transId || !params) {
    return res.status(400).json({
      transId: transId,
      status: "FAILED",
      transTime: Date.now(),
      errorCode: "10005",
    });
  }

  if (
    !params.courseId ||
    !params.invoiceNumber ||
    !String(params.amount) ||
    !params.clientName ||
    !params.clientAddress ||
    !params.clientPhone ||
    !params.passport
    // !params.courseTitle ||
    // !params.prefix
  ) {
    console.error("Необходимые параметры отсутствуют в запросе:", req.body);
    return res.status(400).json({
      serviceId: serviceId,
      transId: transId,
      status: "FAILED",
      transTime: Date.now(),
      errorCode: "10007",
    });
  }

  try {
    let transaction = (await Order.findOne({ transactionId: transId })) || null;
    const course = (await Course.findById(params.courseId)) || null;

    if (transaction || transaction?.transactionId) {
      return res.status(404).json({
        serviceId: serviceId,
        transId: transId,
        status: "FAILED",
        transTime: Date.now(),
        errorCode: "10010",
      });
    }

    if (!course) {
      return res.status(404).json({
        serviceId: serviceId,
        timestamp: timestamp,
        status: "FAILED",
        errorCode: "10002",
      });
    }
    if (course.price * 100 !== amount) {
      return res.status(400).json({
        serviceId: serviceId,
        timestamp: timestamp,
        status: "FAILED",
        errorCode: "10011",
      });
    }

    const newOrder = await Order.create({
      transactionId: transId,
      invoiceNumber: params.invoiceNumber,
      create_time: timestamp,
      amount: amount,
      course_id: course._id,
      status: "ВЫСТАВЛЕНО",
      paymentType: "Uzum",
      clientName: params.clientName || "Не указано",
      clientPhone: params.clientPhone || "Не указано",
      clientAddress: params.clientAddress || "Не указано",
      tgUsername: params.tgUsername || "Не указано",
      passport: params.passport || "Не указано",
      // prefix: params.prefix,
      // courseTitle: params.courseTitle,
    });
    await Invoice.findOneAndUpdate(
      { invoiceNumber: newOrder.invoiceNumber },
      { status: "ВЫСТАВЛЕНО" }
    );
    console.log(newOrder);

    res.status(201).json({
      serviceId: serviceId,
      transId: transId,
      status: "CREATED",
      transTime: Date.now(),
      data: {
        courseId: {
          value: course._id,
        },
        invoiceNumber: {
          value: newOrder.invoiceNumber,
        },
        clientName: {
          value: newOrder.clientName,
        },
        clientAddress: {
          value: newOrder.clientAddress,
        },
        clientPhone: {
          value: newOrder.clientPhone,
        },
        passport: {
          value: newOrder.passport,
        },
        tgUsername: {
          value: newOrder.tgUsername,
        },
      },
      amount: amount,
    });
  } catch (error) {
    console.log("Received error: ", error);
    res.status(500).json({
      status: "FAILED",
      errorCode: "99999",
    });
  }
};

const confirmTransaction = async (req, res) => {
  const { serviceId, timestamp, transId, paymentSource } = req.body;

  if (!serviceId || !timestamp || !transId || !paymentSource) {
    return res.status(400).json({
      status: "FAILED",
      confirmTime: timestamp,
      errorCode: "10005",
    });
  }
  try {
    let order = (await Order.findOne({ transactionId: transId })) || null;

    if (!order || !order?.transactionId) {
      return res.status(404).json({
        serviceId: serviceId,
        transId: transId,
        status: "FAILED",
        confirmTime: timestamp,
        errorCode: "10014",
      });
    }
    switch (order.status) {
      case "ОТМЕНЕНО":
        return res.status(400).json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          confirmTime: timestamp,
          errorCode: "10015",
        });
      case "ОПЛАЧЕНО":
        return res.status(400).json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          confirmTime: timestamp,
          errorCode: "10016",
        });
    }

    order.status = "ОПЛАЧЕНО";
    order.perform_time = Date.now();
    await order.save();

    await Invoice.findOneAndUpdate(
      { invoiceNumber: order.invoiceNumber },
      { status: "ОПЛАЧЕНО" }
    );

    res.status(200).json({
      serviceId: serviceId,
      transId: transId,
      status: "CONFIRMED",
      confirmTime: Date.now(),
      data: {
        courseId: {
          value: order.course_id,
        },
        invoiceNumber: {
          value: order.invoiceNumber,
        },
        clientName: {
          value: order.clientName,
        },
        clientAddress: {
          value: order.clientAddress,
        },
        clientPhone: {
          value: order.clientPhone,
        },
        passport: {
          value: order.passport,
        },
        tgUsername: {
          value: order.tgUsername,
        },
      },
      amount: order.amount,
    });
  } catch (error) {
    console.log("Received error: ", error);
    res.status(500).json({
      status: "FAILED",
      errorCode: "99999",
    });
  }
};

const reverseTransaction = async (req, res) => {
  const { serviceId, transId, timestamp } = req.body;

  if (!serviceId || !transId || !timestamp) {
    return res.status(400).json({
      status: "FAILED",
      reverseTime: Date.now(),
      errorCode: "10005",
    });
  }
  try {
    let order = (await Order.findOne({ transactionId: transId })) || null;

    if (!order || !order?.transactionId) {
      return res.status(404).json({
        serviceId: serviceId,
        transId: transId,
        status: "FAILED",
        confirmTime: timestamp,
        errorCode: "10014",
      });
    }
    switch (order?.status) {
      case "ОТМЕНЕНО":
        return res.status(400).json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          confirmTime: Date.now(),
          errorCode: "10018",
        });
      case "ОПЛАЧЕНО":
        return res.status(400).json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          confirmTime: Date.now(),
          errorCode: "10017",
        });
    }

    order.status = "ОТМЕНЕНО";
    order.reverseTime = Date.now();
    order.save();

    await Invoice.findOneAndUpdate(
      { invoiceNumber: order.invoiceNumber },
      { status: "ОТМЕНЕНО" }
    );

    res.status(200).json({
      serviceId: serviceId,
      transId: transId,
      status: "REVERSED",
      reverseTime: Date.now(),
      data: {
        courseId: {
          value: order.course_id,
        },
        invoiceNumber: {
          value: order.invoiceNumber,
        },
        clientName: {
          value: order.clientName,
        },
        clientAddress: {
          value: order.clientAddress,
        },
        clientPhone: {
          value: order.clientPhone,
        },
        passport: {
          value: order.passport,
        },
        tgUsername: {
          value: order.tgUsername,
        },
      },
      amount: order.amount,
    });
  } catch (error) {
    console.log("Received error: ", error);
    res.status(500).json({
      status: "FAILED",
      errorCode: "99999",
    });
  }
};

const checkTransactionStatus = async (req, res) => {
  const { serviceId, timestamp, transId } = req.body;

  if (!serviceId || !transId || !timestamp) {
    return res.status(400).json({
      status: "FAILED",
      errorCode: "10005",
    });
  }

  try {
    const order = (await Order.findOne({ transactionId: transId })) || null;

    if (!order || !order?.transactionId) {
      return res.status(404).json({
        serviceId: serviceId,
        transId: transId,
        status: "FAILED",
        transTime: order.create_time || null,
        confirmTime: order.perform_time || null,
        reverseTime: order.cancel_time || null,
        errorCode: "10014",
      });
    }

    res.status(200).json({
      serviceId: serviceId,
      transId: order.transactionId,
      status: order.status,
      transTime: order.create_time || null,
      confirmTime: order.perform_time || null,
      reverseTime: order.cancel_time || null,
      data: {
        courseId: {
          value: order.course_id,
        },
        invoiceNumber: {
          value: order.invoiceNumber,
        },
        clientName: {
          value: order.clientName,
        },
        clientAddress: {
          value: order.clientAddress,
        },
        clientPhone: {
          value: order.clientPhone,
        },
        passport: {
          value: order.passport,
        },
        tgUsername: {
          value: order.tgUsername,
        },
      },
      amount: order.amount,
    });
  } catch (error) {
    console.log("Received error: ", error);
    res.status(500).json({
      status: "FAILED",
      errorCode: "99999",
    });
  }
};

module.exports = {
  loginUzumBank,
  checkTransaction,
  createTransaction,
  confirmTransaction,
  reverseTransaction,
  checkTransactionStatus,
};