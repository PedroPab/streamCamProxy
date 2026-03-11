/**
 * Renderiza la página HTML principal con el stream embebido
 * @param {express.Request} req - Request de Express
 * @param {express.Response} res - Response de Express
 */
const homeRouter = (req, res) => {
    res.sendFile('index.html', { root: 'src/public' });
};


export default homeRouter;
