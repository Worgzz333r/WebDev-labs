const errorHandler = (err, req, res, next) => {
    // помилки Prisma мають код
    if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Record not found' });
    }
    if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Record with these unique values already exists' });
    }
    if (err.code === 'P2003') {
        return res.status(400).json({ error: 'Related record does not exist' });
    }

    // некоректний JSON у тілі запиту
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
};

module.exports = errorHandler;