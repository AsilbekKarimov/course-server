const crypto = require("crypto");
const SECRET_KEY = process.env.CLICK_SECRET_KEY;

exports.generateClickPaymentUrl = (req, res) => {
    const { amount, merchant_trans_id, course_id } = req.body;

    if (!amount || !merchant_trans_id || !course_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const service_id = "37390";
    const merchant_id = "12110";
    const merchant_user_id = "46320";
    const return_url = "https://forum.norbekovgroup.uz/course-info";

    const sign_time = new Date().toISOString();
    const sign_string = crypto
        .createHash("md5")
        .update(
            `${merchant_trans_id}${service_id}${SECRET_KEY}${amount}${merchant_id}${sign_time}`
        )
        .digest("hex");

    const paymentUrl = `https://my.click.uz/services/pay/?service_id=${service_id}&merchant_id=${merchant_id}&merchant_user_id=${merchant_user_id}&transaction_param=${merchant_trans_id}&amount=${amount}&additional_param3=${course_id}&return_url=${encodeURIComponent(
        return_url
    )}`;

    return res.json({ paymentUrl });
};
