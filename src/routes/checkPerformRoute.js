const express = require('express');
const Courses = require('../models/courseModel');
const router = express.Router();

router.post('/check-perform-transaction', async (req, res) => {
    const { amount, account, id } = req.body;

    const course = await getCourseById(account.course_id);

    if (!course) {
        return res.json({
            jsonrpc: '2.0',
            id: req.body.id,
            error: {
                code: -31050,
                message: { ru: 'Курс не найден', uz: 'Kurs topilmadi', en: 'Course not found' }
            }
        });
    }

    if (course.price !== amount) {
        return res.json({
            jsonrpc: '2.0',
            id: req.body.id,
            error: {
                code: -31001,
                message: { ru: 'Неверная сумма', uz: 'Noto‘g‘ri summa', en: 'Incorrect amount' }
            }
        });
    }

    res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        result: { allow: true }
    });
});

async function getCourseById(id) {
    const course = await Courses.findById(id);
    return course;
}

module.exports = router;

